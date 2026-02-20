import { useEffect, useMemo, useState } from "react";
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

const formIssuesSample = [
  { time: "00:42", description: "Torso lean > 8°" },
  { time: "01:58", description: "Elbow flare detected" },
];

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

  const liveDuration = useMemo(
    () => new Date(sessionTimer * 1000).toISOString().substring(14, 19),
    [sessionTimer]
  );

  useEffect(() => {
    if (screen !== "live" || isPaused) return;
    const id = setInterval(() => setSessionTimer((t) => t + 1), 1000);
    const repId = setInterval(
      () => setRepCount((r) => r + 1),
      2200 // light auto increments to visualize flow
    );
    return () => {
      clearInterval(id);
      clearInterval(repId);
    };
  }, [screen, isPaused]);

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
        setWsError("WebSocket error");
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          setLiveData(payload);
        } catch (err) {
          console.error("Failed to parse live data", err);
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      setWsStatus("disconnected");
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [screen]);

  const startLiveSession = (exercise) => {
    setSelectedExercise(exercise);
    setRepCount(0);
    setSessionTimer(0);
    setIsPaused(false);
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
            Connect your sensors to start the REPX demo.
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
            Start a guided Bicep Curl session or review progress.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setScreen("selectExercise")}
              className="flex-1 py-3 rounded-xl bg-accent text-black font-semibold"
            >
              Quick Start
            </button>
            <button
              onClick={() => setScreen("history")}
              className="w-24 py-3 rounded-xl border border-border text-text-primary"
            >
              History
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
        {wsError ? <span className="text-accent">Check BLE bridge</span> : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Card title="Timer">
          <p className="text-3xl font-bold text-text-primary">{liveDuration}</p>
          <p className="text-xs text-text-secondary">Live session</p>
        </Card>
        <RepCounter count={repCount} />
      </div>
      <UnityEmbedPlaceholder />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricTile
          label="Arm Elevation Angle"
          value={
            typeof liveData?.p1 === "number"
              ? `${liveData.p1.toFixed(1)}°`
              : "62°"
          }
        />
        <MetricTile
          label="Elbow Angle"
          value={
            typeof liveData?.dP === "number"
              ? `${liveData.dP.toFixed(1)}°`
              : "47°"
          }
        />
        <MetricTile
          label="Torso Lean (pitch)"
          value={
            typeof liveData?.p0 === "number"
              ? `${liveData.p0.toFixed(1)}°`
              : "5°"
          }
        />
      </div>
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
        {formIssuesSample.map((issue) => (
          <div
            key={issue.time}
            className="flex items-center justify-between py-2 border-b border-border last:border-none"
          >
            <p className="text-sm text-text-primary">{issue.description}</p>
            <span className="text-xs text-text-secondary">{issue.time}</span>
          </div>
        ))}
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
