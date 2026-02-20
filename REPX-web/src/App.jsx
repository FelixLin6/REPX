import { useEffect, useMemo, useRef, useState } from "react";
import BicepQualityEvaluator from "./utils/BicepQualityEvaluator";
import Header from "./components/Header";
import Card from "./components/Card";
import MetricTile from "./components/MetricTile";
import UnityEmbedPlaceholder from "./components/UnityEmbedPlaceholder";
import RepCounter from "./components/RepCounter";
import BottomTabs from "./components/BottomTabs";
import {
  sensors,
  history as historyData,
  exerciseCatalog,
} from "./mockData";

export default function App() {
  const [screen, setScreen] = useState("welcome");
  const [activeTab, setActiveTab] = useState("home");
  const [sessionTimer, setSessionTimer] = useState(0);
  const [repCount, setRepCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState("Bicep Curl");
  const [selectedSession, setSelectedSession] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [wsError, setWsError] = useState(null);
  const [coachCue, setCoachCue] = useState(null);
  const [formIssues, setFormIssues] = useState([]);
  const [bicepMetrics, setBicepMetrics] = useState({
    elbowAngle: null,
    elbowVel: null,
    upperarmSway: null,
    upperarmVelPeak: null,
  });
  const bicepMetricState = useRef({
    time: null,
    angle: null,
    p0: null,
    velSign: null,
    minP0: null,
    maxP0: null,
    peakVel: 0,
  });
  const evaluatorRef = useRef(new BicepQualityEvaluator());
  const repState = useRef({ active: false, startPerf: null });
  const setTimeRef = useRef(0);
  const pausedRef = useRef(false);
  const unityFrameRef = useRef(null);

  const liveDuration = useMemo(
    () => new Date(sessionTimer * 1000).toISOString().substring(14, 19),
    [sessionTimer]
  );

  useEffect(() => {
    setTimeRef.current = sessionTimer;
  }, [sessionTimer]);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    const canTrackTime =
      screen === "live" && !isPaused && wsStatus === "connected";
    if (!canTrackTime) return;
    const id = setInterval(() => setSessionTimer((t) => t + 1), 1000);
    return () => {
      clearInterval(id);
    };
  }, [screen, isPaused, wsStatus]);

  useEffect(() => {
    if (["home", "live", "history", "settings"].includes(screen)) {
      setActiveTab(screen);
    }
  }, [screen]);

  useEffect(() => {
    if (screen !== "live") return undefined;

    let ws;
    let reconnectTimer;
    let cancelled = false;

    const signWithDeadband = (value, deadband = 1) => {
      if (!Number.isFinite(value) || Math.abs(value) < deadband) return 0;
      return value > 0 ? 1 : -1;
    };

    const resetBicepMetrics = () => {
      bicepMetricState.current = {
        time: null,
        angle: null,
        p0: null,
        velSign: null,
        minP0: null,
        maxP0: null,
        peakVel: 0,
      };
      setBicepMetrics({
        elbowAngle: null,
        elbowVel: null,
        upperarmSway: null,
        upperarmVelPeak: null,
      });
    };
    const resetFormIssues = () => {
      setFormIssues([]);
      try {
        localStorage.removeItem("formIssuesCurrentSet");
      } catch (e) {
        // ignore storage issues
      }
    };

    const connect = () => {
      if (cancelled) return;
      setWsStatus("connecting");
      setWsError(null);
      ws = new WebSocket("ws://localhost:8765");

      ws.onopen = () => setWsStatus("connected");

      ws.onclose = () => {
        setWsStatus("disconnected");
        if (!cancelled) {
          reconnectTimer = setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => {
        setWsError("Sensor link issue");
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          setLiveData(payload);
          if (pausedRef.current) return;

          // Forward live data to Unity (if embedded) via postMessage
          try {
            unityFrameRef.current?.contentWindow?.postMessage(
              { type: "liveData", payload },
              "*"
            );
          } catch (e) {
            // ignore postMessage errors
          }

          evaluatorRef.current.update(payload);

          if (selectedExercise === "Bicep Curl") {
            const now = performance.now();
            const angle =
              typeof payload?.dP === "number" ? payload.dP : null; // elbow angle proxy (pitch diff)
            const p0 = typeof payload?.p0 === "number" ? payload.p0 : null; // upper arm pitch

            const last = bicepMetricState.current;
            let elbowVel = null;

            if (angle !== null && last.time !== null && last.angle !== null) {
              const dt = (now - last.time) / 1000;
              if (dt > 0) {
                elbowVel = (angle - last.angle) / dt;
              }
            }

            if (p0 !== null) {
              if (last.minP0 === null || p0 < last.minP0) last.minP0 = p0;
              if (last.maxP0 === null || p0 > last.maxP0) last.maxP0 = p0;

              if (last.time !== null && last.p0 !== null) {
                const dt = (now - last.time) / 1000;
                if (dt > 0) {
                  const p0Vel = (p0 - last.p0) / dt;
                  const absVel = Math.abs(p0Vel);
                  if (absVel > last.peakVel) last.peakVel = absVel;
                }
              }
            }

            const currentSign = signWithDeadband(elbowVel);
            const prevSign = last.velSign;

            // mark rep start on upward motion
            if (!repState.current.active && currentSign === 1) {
              repState.current = { active: true, startPerf: now };
              evaluatorRef.current.start_rep();
            }

            // Detect a top-of-rep transition (positive → negative velocity)
            if (
              currentSign === -1 &&
              prevSign === 1 &&
              last.maxP0 !== null &&
              last.minP0 !== null
            ) {
              const sway = last.maxP0 - last.minP0;
              const peak = last.peakVel || null;
              const repTime =
                repState.current.active && repState.current.startPerf !== null
                  ? (now - repState.current.startPerf) / 1000
                  : 0;
              const result = evaluatorRef.current.end_rep(
                repTime,
                setTimeRef.current
              );
              setBicepMetrics((prev) => ({
                elbowAngle: angle ?? prev.elbowAngle,
                elbowVel: elbowVel ?? prev.elbowVel,
                upperarmSway: result?.rep_metrics?.upperarm_sway ?? sway,
                upperarmVelPeak: result?.rep_metrics?.peak_elbow_vel ?? peak,
              }));
              setRepCount((c) => {
                const next = c + 1;
                const issueMap = {
                  swinging: "Keep upper arm still",
                  jerky: "Smooth it out",
                  too_fast: "Slow down",
                  too_slow: "Speed up",
                  over_rom: "Don't overextend",
                  partial_rom: "Curl higher",
                };
                const isIssue = Boolean(result?.issue);
                const positiveCues = [
                  "Good form",
                  "Keep it up",
                  "Nice rep",
                  "Solid tempo",
                ];
                const cueText = isIssue
                  ? issueMap[result.issue] || "Check form"
                  : positiveCues[next % positiveCues.length];
                  setCoachCue({
                  text: cueText,
                  tone: isIssue ? "alert" : "positive",
                  rep: next,
                });
                if (isIssue) {
                  const entry = {
                    time: liveDuration,
                    description: cueText,
                  };
                  setFormIssues((prev) => {
                    if (prev.some((p) => p.description === entry.description)) {
                      return prev;
                    }
                    const updated = [...prev, entry];
                    try {
                      localStorage.setItem(
                        "formIssuesCurrentSet",
                        JSON.stringify(updated)
                      );
                    } catch (e) {
                      // ignore storage issues
                    }
                    return updated;
                  });
                }
                return next;
              });
              repState.current = { active: false, startPerf: null };
              // reset per-rep trackers
              last.minP0 = p0;
              last.maxP0 = p0;
              last.peakVel = 0;
            } else {
              setBicepMetrics((prev) => ({
                elbowAngle: angle ?? prev.elbowAngle,
                elbowVel: elbowVel ?? prev.elbowVel,
                upperarmSway: prev.upperarmSway,
                upperarmVelPeak: prev.upperarmVelPeak,
              }));
            }

            last.time = now;
            last.angle = angle;
            last.p0 = p0;
            last.velSign = currentSign !== 0 ? currentSign : prevSign;
          }
        } catch (err) {
          console.error("Failed to parse live data", err);
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      setWsStatus("disconnected");
      repState.current = { active: false, startPerf: null };
      evaluatorRef.current.reset();
      setCoachCue(null);
      resetBicepMetrics();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [screen, selectedExercise]);

  const startLiveSession = (exercise) => {
    setSelectedExercise(exercise);
    setRepCount(0);
    setSessionTimer(0);
    setIsPaused(false);
    repState.current = { active: false, startPerf: null };
    evaluatorRef.current.reset();
    setCoachCue(null);
    setFormIssues([]);
    try {
      localStorage.removeItem("formIssuesCurrentSet");
    } catch (e) {
      // ignore storage issues
    }
    bicepMetricState.current = {
      time: null,
      angle: null,
      p0: null,
      velSign: null,
      minP0: null,
      maxP0: null,
      peakVel: 0,
    };
    setBicepMetrics({
      elbowAngle: null,
      elbowVel: null,
      upperarmSway: null,
      upperarmVelPeak: null,
    });
    setScreen("live");
  };

  const endSet = () => {
    setScreen("summary");
  };

  const changeTab = (tab) => {
    setScreen(tab);
  };

  const renderSensorStatus = () => (
    <Card title="Sensors">
      <div className="space-y-2">
        {sensors.map((sensor) => (
          <div
            key={sensor.name}
            className="flex items-center justify-between bg-[#0f0f0f] border border-border rounded-xl px-3 py-2"
          >
            <p className="text-sm text-text-primary">{sensor.name}</p>
            <span
              className={`text-xs font-semibold px-2 py-1 rounded-full ${
                sensor.status === "Connected"
                  ? "bg-[#123d1c] text-[#7cff7a]"
                  : "bg-[#3a2b12] text-accent"
              }`}
            >
              {sensor.status}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );

  const renderWelcome = () => (
    <div className="space-y-6">
      <Header subtitle="Motion intelligence for every rep." />
      <Card>
        <div className="space-y-4 text-center">
          <p className="text-text-secondary">
            Connect your sensors to start REPX.
          </p>
          <button
            onClick={() => setScreen("connect")}
            className="w-full py-3 rounded-xl bg-accent text-black font-semibold"
          >
            Get Started
          </button>
        </div>
      </Card>
    </div>
  );

  const renderConnect = () => (
    <div className="space-y-6">
      <Header subtitle="Step 1 · Connect sensors" />
      {renderSensorStatus()}
      <button
        onClick={() => setScreen("home")}
        className="w-full py-3 rounded-xl bg-accent text-black font-semibold"
      >
        Continue
      </button>
    </div>
  );

  const renderHome = () => (
    <div className="space-y-5">
      <Header subtitle="Track, review, and refine every set." />
      <Card>
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Jump into a guided session right away.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setScreen("selectExercise")}
              className="flex-1 py-3 rounded-xl bg-accent text-black font-semibold"
            >
              Quick Start
            </button>
          </div>
        </div>
      </Card>
      {renderSensorStatus()}
      <Card title="Last Session">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-primary">Bicep Curl</p>
            <p className="text-xs text-text-secondary">28 reps · Yesterday</p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-[#123d1c] text-[#7cff7a]">
            Completed
          </span>
        </div>
      </Card>
      <Card title="Weekly Stats">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-text-primary">4</p>
            <p className="text-xs text-text-secondary">Sessions</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">112</p>
            <p className="text-xs text-text-secondary">Total Reps</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">32m</p>
            <p className="text-xs text-text-secondary">Time</p>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderSelectExercise = () => (
    <div className="space-y-5">
      <Header subtitle="Quick Start · Choose by muscle group" />
      <Card title="Quick Start">
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Start a guided Bicep Curl immediately.
          </p>
          <button
            onClick={() => startLiveSession("Bicep Curl")}
            className="w-full py-3 rounded-xl bg-accent text-black font-semibold"
          >
            Start Bicep Curls
          </button>
        </div>
      </Card>
      {exerciseCatalog.map((group) => (
        <Card key={group.group} title={group.group}>
          <div className="space-y-4">
            {group.subgroups.map((sub) => (
              <div key={sub.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-text-primary">
                    {sub.name}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {sub.exercises.length} moves
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sub.exercises.map((exercise) => {
                    const isSelected = selectedExercise === exercise.name;
                    return (
                      <button
                        key={exercise.name}
                        onClick={() => startLiveSession(exercise.name)}
                        className={`flex items-center justify-between px-3 py-3 rounded-xl border transition-colors ${
                          isSelected
                            ? "border-accent bg-[#181600]"
                            : "border-border bg-[#0f0f0f]"
                        }`}
                      >
                        <div className="text-left">
                          <p className="text-sm text-text-primary">
                            {exercise.name}
                          </p>
                          {exercise.equipment ? (
                            <p className="text-xs text-text-secondary">
                              {exercise.equipment}
                            </p>
                          ) : null}
                        </div>
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            isSelected
                              ? "bg-accent text-black"
                              : "bg-[#1a1a1a] text-text-secondary"
                          }`}
                        >
                          Start
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );

  const formatMetric = (value, digits = 1, suffix = "°") =>
    Number.isFinite(value) ? `${value.toFixed(digits)}${suffix}` : "—";

  const renderLiveMetrics = () => {
    const isBicep = selectedExercise === "Bicep Curl";
    if (isBicep) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <MetricTile
            label="Elbow Angle"
            value={formatMetric(bicepMetrics.elbowAngle)}
          />
          <MetricTile
            label="Elbow Velocity"
            value={formatMetric(bicepMetrics.elbowVel, 1, "°/s")}
          />
          <MetricTile
            label="Upper Arm Sway"
            value={formatMetric(bicepMetrics.upperarmSway)}
          />
          <MetricTile
            label="Upper Arm Peak Vel"
            value={formatMetric(bicepMetrics.upperarmVelPeak, 1, "°/s")}
          />
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricTile
          label="Arm Elevation Angle"
          value={
            typeof liveData?.p1 === "number"
              ? `${liveData.p1.toFixed(1)}°`
              : "—"
          }
        />
        <MetricTile
          label="Elbow Angle"
          value={
            typeof liveData?.dP === "number"
              ? `${liveData.dP.toFixed(1)}°`
              : "—"
          }
        />
        <MetricTile
          label="Torso Lean (pitch)"
          value={
            typeof liveData?.p0 === "number"
              ? `${liveData.p0.toFixed(1)}°`
              : "—"
          }
        />
      </div>
    );
  };

  const renderLive = () => (
    <div className="space-y-5">
      <Header subtitle={selectedExercise} />
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>
          Live data feed:{" "}
          <span
            className={
              wsStatus === "connected"
                ? "text-[#7cff7a]"
                : wsStatus === "connecting"
                ? "text-accent"
                : "text-text-secondary"
            }
          >
            {wsStatus}
          </span>
        </span>
        {wsError ? <span className="text-accent">Check sensor connection</span> : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Card title="Timer">
          <p className="text-3xl font-bold text-text-primary">{liveDuration}</p>
          <p className="text-xs text-text-secondary">Live session</p>
        </Card>
        <RepCounter count={repCount} />
      </div>
      <Card
        className={`border ${
          coachCue?.tone === "alert"
            ? "border-accent bg-[#1a1200]"
            : "border-[#123d1c] bg-[#0f1a12]"
        } ${coachCue ? "animate-pulse" : ""}`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`h-3 w-3 rounded-full ${
              coachCue?.tone === "alert" ? "bg-accent" : "bg-[#7cff7a]"
            }`}
          />
          <p className="text-lg text-text-primary font-semibold">
            {coachCue?.text || "Coaching will appear here as you move."}
          </p>
        </div>
      </Card>
      <UnityEmbedPlaceholder iframeRef={unityFrameRef} />
      {renderLiveMetrics()}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setIsPaused((p) => !p)}
          className="py-3 rounded-xl bg-[#0f0f0f] border border-border text-text-primary font-semibold"
        >
          {isPaused ? "Resume" : "Pause"}
        </button>
        <button
          onClick={endSet}
          className="py-3 rounded-xl bg-accent text-black font-semibold"
        >
          End Set
        </button>
      </div>
    </div>
  );

  const renderSummary = () => (
    <div className="space-y-5">
      <Header subtitle="Set Summary" />
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-text-secondary uppercase tracking-wide">
              Total Reps
            </p>
            <p className="text-4xl font-bold text-accent">{repCount}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-secondary">Exercise</p>
            <p className="text-sm text-text-primary">{selectedExercise}</p>
          </div>
        </div>
      </Card>
      <Card title="Form Issues">
        {formIssues.length === 0 ? (
          <p className="text-sm text-text-primary">Great set—no issues flagged.</p>
        ) : (
          formIssues.map((issue, idx) => (
            <div
              key={`${issue.time}-${idx}`}
              className="flex items-center justify-between py-2 border-b border-border last:border-none"
            >
              <p className="text-sm text-text-primary">{issue.description}</p>
            </div>
          ))
        )}
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setScreen("history")}
          className="py-3 rounded-xl bg-[#0f0f0f] border border-border text-text-primary font-semibold"
        >
          View History
        </button>
        <button
          onClick={() => setScreen("home")}
          className="py-3 rounded-xl bg-accent text-black font-semibold"
        >
          Done
        </button>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-5">
      <Header subtitle="Recent sessions" />
      {historyData.map((session) => (
        <Card
          key={session.id}
          title={session.exercise}
          actions={
            <button
              onClick={() => {
                setSelectedSession(session);
                setScreen("sessionDetail");
              }}
              className="text-xs text-accent"
            >
              View
            </button>
          }
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-primary">{session.date}</p>
              <p className="text-xs text-text-secondary">
                {session.totalReps} reps · {session.duration}
              </p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-[#123d1c] text-[#7cff7a]">
              Complete
            </span>
          </div>
        </Card>
      ))}
    </div>
  );

  const renderSessionDetail = () => {
    if (!selectedSession) return null;
    return (
      <div className="space-y-5">
        <Header subtitle="Session Detail" />
        <Card title={selectedSession.exercise}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-primary">{selectedSession.date}</p>
              <p className="text-xs text-text-secondary">
                {selectedSession.duration}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-secondary uppercase tracking-wide">
                Total Reps
              </p>
              <p className="text-2xl font-bold text-accent">
                {selectedSession.totalReps}
              </p>
            </div>
          </div>
        </Card>
        <Card title="Sets">
          <div className="space-y-2">
            {selectedSession.sets.map((set) => (
              <div
                key={set.id}
                className="flex items-center justify-between bg-[#0f0f0f] border border-border rounded-xl px-3 py-2"
              >
                <p className="text-sm text-text-primary">Set {set.id}</p>
                <p className="text-sm text-text-secondary">
                  {set.reps} reps · {set.start} - {set.end}
                </p>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Form Issues">
          {selectedSession.formIssues.length === 0 ? (
            <p className="text-sm text-text-secondary">No issues flagged.</p>
          ) : (
            selectedSession.formIssues.map((issue) => (
              <div
                key={issue.time}
                className="flex items-center justify-between py-2 border-b border-border last:border-none"
              >
                <p className="text-sm text-text-primary">
                  {issue.description}
                </p>
                <span className="text-xs text-text-secondary">
                  {issue.time}
                </span>
              </div>
            ))
          )}
        </Card>
        <button
          onClick={() => setScreen("history")}
          className="w-full py-3 rounded-xl bg-[#0f0f0f] border border-border text-text-primary font-semibold"
        >
          Back to History
        </button>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="space-y-5">
      <Header subtitle="Preferences" />
      <Card title="Session">
        <div className="flex items-center justify-between py-2">
          <p className="text-sm text-text-primary">Vibration alerts</p>
          <span className="text-xs px-2 py-1 rounded-full bg-[#123d1c] text-[#7cff7a]">
            Enabled
          </span>
        </div>
        <div className="flex items-center justify-between py-2 border-t border-border">
          <p className="text-sm text-text-primary">Auto-save sets</p>
          <span className="text-xs px-2 py-1 rounded-full bg-[#3a2b12] text-accent">
            Enabled
          </span>
        </div>
      </Card>
      {renderSensorStatus()}
    </div>
  );

  const renderContent = () => {
    switch (screen) {
      case "welcome":
        return renderWelcome();
      case "connect":
        return renderConnect();
      case "selectExercise":
        return renderSelectExercise();
      case "live":
        return renderLive();
      case "summary":
        return renderSummary();
      case "history":
        return renderHistory();
      case "sessionDetail":
        return renderSessionDetail();
      case "settings":
        return renderSettings();
      case "home":
      default:
        return renderHome();
    }
  };

  const shouldShowTabs = !["welcome", "connect"].includes(screen);

  return (
    <div className="bg-background min-h-screen text-text-primary">
      <div className="max-w-3xl mx-auto px-4 pb-24 pt-6">{renderContent()}</div>
      {shouldShowTabs ? (
        <BottomTabs active={activeTab} onChange={changeTab} />
      ) : null}
    </div>
  );
}
