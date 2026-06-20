"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, X, Navigation, RefreshCw, Wifi, WifiOff, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { sendNavGoal, setNavigationMode, listenToDeviceStatus } from "@/lib/firebase-data";

const C = {
  bg: "#0B0E14",
  bgAlt: "#0D1117",
  fill: "#152238",
  neon: "#00F2FF",
  redNeon: "#FF0055",
} as const;

interface MapPlanningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToManual?: () => void;
}

export function MapPlanningModal({ isOpen, onClose, onSwitchToManual }: MapPlanningModalProps) {
  const [selectedPoint, setSelectedPoint] = useState<{ x: number; y: number } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sentStatus, setSentStatus] = useState<"idle" | "success" | "error">("idle");
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);

  // States for manual input synchronization
  const [inputX, setInputX] = useState("");
  const [inputY, setInputY] = useState("");

  // Sync selectedPoint to input fields
  useEffect(() => {
    if (selectedPoint) {
      const parsedX = parseFloat(inputX);
      const parsedY = parseFloat(inputY);
      if (isNaN(parsedX) || parsedX !== selectedPoint.x) {
        setInputX(selectedPoint.x.toString());
      }
      if (isNaN(parsedY) || parsedY !== selectedPoint.y) {
        setInputY(selectedPoint.y.toString());
      }
    } else {
      setInputX("");
      setInputY("");
    }
  }, [selectedPoint]);

  const handleXInputChange = (val: string) => {
    setInputX(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      setSelectedPoint((prev) => ({
        x: parsed,
        y: prev ? prev.y : 0,
      }));
      setSentStatus("idle");
    } else if (val === "") {
      setSelectedPoint((prev) => {
        if (!prev) return null;
        if (inputY === "") return null;
        return { x: 0, y: prev.y };
      });
    }
  };

  const handleYInputChange = (val: string) => {
    setInputY(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      setSelectedPoint((prev) => ({
        x: prev ? prev.x : 0,
        y: parsed,
      }));
      setSentStatus("idle");
    } else if (val === "") {
      setSelectedPoint((prev) => {
        if (!prev) return null;
        if (inputX === "") return null;
        return { x: prev.x, y: 0 };
      });
    }
  };
  
  // ROS Connection State
  const [wsUrl, setWsUrl] = useState("ws://192.168.1.10:9090");
  const [connStatus, setConnStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [bounds, setBounds] = useState({ minX: -5.0, maxX: 5.0, minY: -5.0, maxY: 5.0 });

  // Canvas and Draw State Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const boundsRef = useRef(bounds);
  const selectedPointRef = useRef(selectedPoint);
  const poseRef = useRef<{ x: number; y: number; yaw: number } | null>(null);
  const scansRef = useRef<{ x: number; y: number }[]>([]);
  const pathRef = useRef<{ x: number; y: number }[]>([]);

  // ROS Subscription Refs
  const rosInstanceRef = useRef<any>(null);
  const mapSubRef = useRef<any>(null);
  const odomSubRef = useRef<any>(null);
  const scanSubRef = useRef<any>(null);
  const planSubRef = useRef<any>(null);
  const goalPubRef = useRef<any>(null);

  // Sync refs to state changes
  useEffect(() => {
    boundsRef.current = bounds;
  }, [bounds]);

  useEffect(() => {
    selectedPointRef.current = selectedPoint;
  }, [selectedPoint]);

  // WebSocket Connection Handlers
  const disconnectRos = () => {
    if (mapSubRef.current) {
      try { mapSubRef.current.unsubscribe(); } catch (e) {}
      mapSubRef.current = null;
    }
    if (odomSubRef.current) {
      try { odomSubRef.current.unsubscribe(); } catch (e) {}
      odomSubRef.current = null;
    }
    if (scanSubRef.current) {
      try { scanSubRef.current.unsubscribe(); } catch (e) {}
      scanSubRef.current = null;
    }
    if (planSubRef.current) {
      try { planSubRef.current.unsubscribe(); } catch (e) {}
      planSubRef.current = null;
    }
    if (rosInstanceRef.current) {
      try { rosInstanceRef.current.close(); } catch (e) {}
      rosInstanceRef.current = null;
    }

    goalPubRef.current = null;
    poseRef.current = null;
    scansRef.current = [];
    pathRef.current = [];
    offscreenCanvasRef.current = null;
    
    setBounds({ minX: -5.0, maxX: 5.0, minY: -5.0, maxY: 5.0 });
    setConnStatus("disconnected");
  };

  const connectRos = async () => {
    if (connStatus !== "disconnected") return;
    setConnStatus("connecting");

    try {
      const ROSLIB = (await import("roslib")) as any;
      const ros = new ROSLIB.Ros({ url: wsUrl });

      ros.on("connection", () => {
        console.log("[ROSBridge] Connected to WebSocket.");
        rosInstanceRef.current = ros;
        setConnStatus("connected");

        // Goal Publisher
        goalPubRef.current = new ROSLIB.Topic({
          ros: ros,
          name: "/goal_pose",
          messageType: "geometry_msgs/PoseStamped",
        });

        // Map Grid Subscriber
        mapSubRef.current = new ROSLIB.Topic({
          ros: ros,
          name: "/map",
          messageType: "nav_msgs/msg/OccupancyGrid",
        });
        mapSubRef.current.subscribe((message: any) => {
          const { width, height, resolution, origin } = message.info;
          const minX = origin.position.x;
          const maxX = minX + width * resolution;
          const minY = origin.position.y;
          const maxY = minY + height * resolution;
          
          setBounds({ minX, maxX, minY, maxY });

          // Render map on offscreen canvas
          if (!offscreenCanvasRef.current) {
            offscreenCanvasRef.current = document.createElement("canvas");
          }
          const offCanvas = offscreenCanvasRef.current;
          offCanvas.width = width;
          offCanvas.height = height;
          const ctx = offCanvas.getContext("2d");
          if (ctx) {
            const imgData = ctx.createImageData(width, height);
            for (let i = 0; i < message.data.length; i++) {
              const val = message.data[i];
              const col = i % width;
              const row = Math.floor(i / width);
              const flippedRow = height - 1 - row;
              const destIndex = (flippedRow * width + col) * 4;

              if (val === -1) {
                // Unknown space: Sleek dark grey/blue
                imgData.data[destIndex] = 21;
                imgData.data[destIndex + 1] = 28;
                imgData.data[destIndex + 2] = 38;
                imgData.data[destIndex + 3] = 255;
              } else if (val >= 50) {
                // Occupied space (Obstacles): Neon cyan
                imgData.data[destIndex] = 56;
                imgData.data[destIndex + 1] = 189;
                imgData.data[destIndex + 2] = 248;
                imgData.data[destIndex + 3] = 255;
              } else {
                // Free space: Dark background matching dashboard
                imgData.data[destIndex] = 11;
                imgData.data[destIndex + 1] = 14;
                imgData.data[destIndex + 2] = 20;
                imgData.data[destIndex + 3] = 255;
              }
            }
            ctx.putImageData(imgData, 0, 0);
          }
        });

        // Robot Odometry Subscriber
        odomSubRef.current = new ROSLIB.Topic({
          ros: ros,
          name: "/odom",
          messageType: "nav_msgs/msg/Odometry",
        });
        odomSubRef.current.subscribe((message: any) => {
          const pos = message.pose.pose.position;
          const ori = message.pose.pose.orientation;

          // Quaternion to Yaw
          const siny_cosp = 2.0 * (ori.w * ori.z + ori.x * ori.y);
          const cosy_cosp = 1.0 - 2.0 * (ori.y * ori.y + ori.z * ori.z);
          const yaw = Math.atan2(siny_cosp, cosy_cosp);

          poseRef.current = { x: pos.x, y: pos.y, yaw: yaw };
        });

        // LiDAR Scanner Subscriber
        scanSubRef.current = new ROSLIB.Topic({
          ros: ros,
          name: "/scan",
          messageType: "sensor_msgs/msg/LaserScan",
        });
        scanSubRef.current.subscribe((message: any) => {
          const { angle_min, angle_increment, range_min, range_max, ranges } = message;
          const currentPose = poseRef.current;
          if (!currentPose) return;

          const points: { x: number; y: number }[] = [];
          for (let i = 0; i < ranges.length; i++) {
            const dist = ranges[i];
            if (dist >= range_min && dist <= range_max) {
              const angle = angle_min + i * angle_increment;
              const localX = dist * Math.cos(angle);
              const localY = dist * Math.sin(angle);
              const mapX = currentPose.x + localX * Math.cos(currentPose.yaw) - localY * Math.sin(currentPose.yaw);
              const mapY = currentPose.y + localX * Math.sin(currentPose.yaw) + localY * Math.cos(currentPose.yaw);
              points.push({ x: mapX, y: mapY });
            }
          }
          scansRef.current = points;
        });

        // Path / Route Planning Subscriber
        planSubRef.current = new ROSLIB.Topic({
          ros: ros,
          name: "/plan",
          messageType: "nav_msgs/msg/Path",
        });
        planSubRef.current.subscribe((message: any) => {
          const points = message.poses.map((p: any) => ({
            x: p.pose.position.x,
            y: p.pose.position.y,
          }));
          pathRef.current = points;
        });
      });

      ros.on("error", (err: any) => {
        console.error("[ROSBridge] WebSocket Error:", err);
        disconnectRos();
      });

      ros.on("close", () => {
        console.log("[ROSBridge] Connection closed.");
        disconnectRos();
      });
    } catch (err) {
      console.error("[ROSBridge] Setup Error:", err);
      setConnStatus("disconnected");
    }
  };

  const handleToggleConnect = () => {
    if (connStatus === "disconnected") {
      localStorage.setItem("rosbridge_ws_url", wsUrl);
      connectRos();
    } else {
      disconnectRos();
    }
  };

  // Subscribe to device status (Firebase) for position fallback if WebSocket is not connected or odom is empty
  useEffect(() => {
    const unsubscribeStatus = listenToDeviceStatus(
      (status) => {
        // Fallback to Firebase status values if not connected via websocket
        if (connStatus !== "connected" || !poseRef.current) {
          if (status.x !== undefined && status.y !== undefined && status.yaw !== undefined) {
            poseRef.current = {
              x: status.x,
              y: status.y,
              yaw: status.yaw,
            };
          }
        }
      },
      (error) => {
        console.error("[Firebase Status fallback] error:", error);
      }
    );

    return () => {
      unsubscribeStatus();
    };
  }, [connStatus]);

  // Canvas drawing loop
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const b = boundsRef.current;

      const mapToCanvas = (mx: number, my: number) => {
        const pctX = (mx - b.minX) / (b.maxX - b.minX);
        const pctY = (my - b.minY) / (b.maxY - b.minY);
        return {
          x: pctX * canvas.width,
          y: (1 - pctY) * canvas.height,
        };
      };

      // 1. Draw Map Background (Bilinear smoothing disabled for sharp grid cells)
      if (offscreenCanvasRef.current) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(offscreenCanvasRef.current, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        // Subtle tech grid lines
        ctx.strokeStyle = "rgba(0, 242, 255, 0.03)";
        ctx.lineWidth = 1;
        const gridCount = 20;
        for (let i = 0; i <= gridCount; i++) {
          ctx.beginPath();
          ctx.moveTo((i / gridCount) * canvas.width, 0);
          ctx.lineTo((i / gridCount) * canvas.width, canvas.height);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(0, (i / gridCount) * canvas.height);
          ctx.lineTo(canvas.width, (i / gridCount) * canvas.height);
          ctx.stroke();
        }
      } else {
        // Fallback: Default Dark space with grid lines
        ctx.fillStyle = C.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = "rgba(0, 242, 255, 0.05)";
        ctx.lineWidth = 1;
        const gridCount = 10;
        for (let i = 0; i <= gridCount; i++) {
          ctx.beginPath();
          ctx.moveTo((i / gridCount) * canvas.width, 0);
          ctx.lineTo((i / gridCount) * canvas.width, canvas.height);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(0, (i / gridCount) * canvas.height);
          ctx.lineTo(canvas.width, (i / gridCount) * canvas.height);
          ctx.stroke();
        }

        // Main Axis Crosshair lines
        ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      }

      // Draw minor grid lines and labels every 1 meter for distance reference
      ctx.save();
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Vertical grids (constant x) and labels
      for (let x = Math.ceil(b.minX); x <= Math.floor(b.maxX); x++) {
        if (x === 0) continue;
        const ptCanvas = mapToCanvas(x, 0);
        
        ctx.strokeStyle = "rgba(0, 242, 255, 0.08)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(ptCanvas.x, 0);
        ctx.lineTo(ptCanvas.x, canvas.height);
        ctx.stroke();

        // Draw distance tag on bottom border of grid
        ctx.fillText(`${x > 0 ? "+" : ""}${x}m`, ptCanvas.x, canvas.height - 18);
      }

      // Horizontal grids (constant y) and labels
      ctx.textAlign = "left";
      for (let y = Math.ceil(b.minY); y <= Math.floor(b.maxY); y++) {
        if (y === 0) continue;
        const ptCanvas = mapToCanvas(0, y);

        ctx.strokeStyle = "rgba(0, 242, 255, 0.08)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, ptCanvas.y);
        ctx.lineTo(canvas.width, ptCanvas.y);
        ctx.stroke();

        // Draw distance tag on left border of grid
        ctx.fillText(`${y > 0 ? "+" : ""}${y}m`, 8, ptCanvas.y);
      }
      ctx.restore();

      // 2. Draw origin axis (0,0) in standard RGB ROS axes colors (X = Red, Y = Green)
      const originCanvas = mapToCanvas(0, 0);
      if (originCanvas.x >= 0 && originCanvas.x <= canvas.width && originCanvas.y >= 0 && originCanvas.y <= canvas.height) {
        ctx.save();
        // X-Axis (Red)
        ctx.strokeStyle = "#FF0055";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(originCanvas.x, originCanvas.y);
        ctx.lineTo(originCanvas.x + 22, originCanvas.y);
        ctx.stroke();

        // Y-Axis (Green)
        ctx.strokeStyle = "#10B981";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(originCanvas.x, originCanvas.y);
        ctx.lineTo(originCanvas.x, originCanvas.y - 22);
        ctx.stroke();

        // Center hub
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(originCanvas.x, originCanvas.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 3. Draw Route Path Line
      const path = pathRef.current;
      if (path && path.length > 0) {
        ctx.save();
        ctx.strokeStyle = "#00F2FF";
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        let first = true;
        for (const pt of path) {
          const cPt = mapToCanvas(pt.x, pt.y);
          if (first) {
            ctx.moveTo(cPt.x, cPt.y);
            first = false;
          } else {
            ctx.lineTo(cPt.x, cPt.y);
          }
        }
        ctx.stroke();
        ctx.restore();
      }

      // 4. Draw LiDAR Scan Dots (Glowing Red)
      const scans = scansRef.current;
      if (scans && scans.length > 0) {
        ctx.save();
        ctx.fillStyle = "#FF0055";
        ctx.shadowColor = "#FF0055";
        ctx.shadowBlur = 4;
        for (const pt of scans) {
          const cPt = mapToCanvas(pt.x, pt.y);
          ctx.beginPath();
          ctx.arc(cPt.x, cPt.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 5. Draw Robot Pose (Triangle with heading & glow ring)
      const pose = poseRef.current;
      if (pose) {
        const cPose = mapToCanvas(pose.x, pose.y);

        ctx.save();
        ctx.translate(cPose.x, cPose.y);
        ctx.rotate(-pose.yaw);

        // Heading triangle pointer
        ctx.fillStyle = "#00F2FF";
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(11, 0);
        ctx.lineTo(-9, -7);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-9, 7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Glow boundary
        ctx.shadowColor = "#00F2FF";
        ctx.shadowBlur = 8;
        ctx.strokeStyle = "rgba(0, 242, 255, 0.45)";
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }

      // 6. Draw Selected Target Goal Pin (Pulsing neon crosshair)
      const selected = selectedPointRef.current;
      if (selected) {
        const cTarget = mapToCanvas(selected.x, selected.y);

        ctx.save();
        ctx.strokeStyle = "#FF0055";
        ctx.lineWidth = 2;
        const pulse = 1 + Math.sin(Date.now() / 150) * 0.15;

        // Pulsing indicator ring
        ctx.beginPath();
        ctx.arc(cTarget.x, cTarget.y, 8 * pulse, 0, Math.PI * 2);
        ctx.stroke();

        // Hub dot
        ctx.fillStyle = "#FF0055";
        ctx.beginPath();
        ctx.arc(cTarget.x, cTarget.y, 3, 0, Math.PI * 2);
        ctx.fill();

        // crosshair guides
        ctx.strokeStyle = "rgba(255, 0, 85, 0.5)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cTarget.x - 12, cTarget.y);
        ctx.lineTo(cTarget.x + 12, cTarget.y);
        ctx.moveTo(cTarget.x, cTarget.y - 12);
        ctx.lineTo(cTarget.x, cTarget.y + 12);
        ctx.stroke();

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Set autonomous mode and load cached ws URL on modal open
  useEffect(() => {
    if (isOpen) {
      setNavigationMode(true).catch((err) => {
        console.error("[MapPlanning] Failed to set autonomous navigation mode:", err);
      });
      
      if (typeof window !== "undefined") {
        const savedUrl = localStorage.getItem("rosbridge_ws_url");
        if (savedUrl) {
          setWsUrl(savedUrl);
        }
        
        // Keep instructions closed by default to avoid layout overflow and keep primary CTA visible
        setIsInstructionsOpen(false);
      }
    } else {
      disconnectRos();
      setSelectedPoint(null);
      setSentStatus("idle");
    }
    return () => {
      disconnectRos();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGridClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const pctX = clickX / rect.width;
    const pctY = clickY / rect.height;

    const b = boundsRef.current;
    const xMeters = b.minX + pctX * (b.maxX - b.minX);
    const yMeters = b.maxY - pctY * (b.maxY - b.minY);

    setSelectedPoint({
      x: Math.round(xMeters * 100) / 100,
      y: Math.round(yMeters * 100) / 100,
    });
    setSentStatus("idle");
  };

  const handleSendGoal = async () => {
    if (!selectedPoint) return;
    setIsSending(true);
    setSentStatus("idle");
    try {
      // 1. Write target coordinates to Firebase
      await sendNavGoal(selectedPoint.x, selectedPoint.y);

      // 2. Publish pose target directly to ROS if connected via Websocket
      if (connStatus === "connected" && goalPubRef.current) {
        const goalPoseMsg = {
          header: {
            frame_id: "map",
            stamp: {
              secs: 0,
              nsecs: 0,
            },
          },
          pose: {
            position: {
              x: selectedPoint.x,
              y: selectedPoint.y,
              z: 0.0,
            },
            orientation: {
              x: 0.0,
              y: 0.0,
              z: 0.0,
              w: 1.0,
            },
          },
        };
        goalPubRef.current.publish(goalPoseMsg);
        console.log("[ROSBridge] Published goal pose to ROS topic /goal_pose:", selectedPoint);
      }

      setSentStatus("success");
    } catch (err) {
      console.error("[MapPlanning] Failed to send nav goal:", err);
      setSentStatus("error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: C.bg }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2 sm:py-3 shrink-0 backdrop-blur-md"
        style={{
          background: `${C.bgAlt}ee`,
          borderBottom: `1px solid ${C.neon}22`,
        }}
      >
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4" style={{ color: C.neon }} />
          <span
            className="font-bold tracking-wider text-xs sm:text-sm uppercase hidden xs:inline"
            style={{ color: C.neon }}
          >
            AirGuard Navigation
          </span>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-1 bg-black/60 p-1 rounded-lg border border-slate-800/80 text-[10px] font-bold uppercase tracking-wider">
          <span 
            className="px-2.5 py-1 rounded font-bold transition-all"
            style={{ background: C.fill, color: C.neon }}
          >
            Rute Otomatis (A*)
          </span>
          <button
            onClick={onSwitchToManual}
            className="px-2.5 py-1 rounded text-slate-400 hover:text-slate-200 transition-all bg-transparent border-0 cursor-pointer font-bold uppercase"
          >
            Kontrol Manual
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-3 sm:p-1.5 min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: `${C.neon}88` }}
          onMouseEnter={(e) => (e.currentTarget.style.color = C.neon)}
          onMouseLeave={(e) => (e.currentTarget.style.color = `${C.neon}88`)}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        {/* Interactive Grid Map */}
        <div className="flex-1 w-full min-h-[35vh] lg:min-h-0 relative flex items-center justify-center p-4 lg:p-6 select-none bg-slate-950/20">
          <div className="relative w-full max-w-[400px] lg:max-w-[480px] aspect-square rounded-2xl border border-slate-800 bg-black/40 overflow-hidden shadow-2xl">
            {/* HTML5 Map Canvas */}
            <canvas
              ref={canvasRef}
              onClick={handleGridClick}
              width={800}
              height={800}
              className="absolute inset-0 w-full h-full cursor-crosshair object-contain z-10"
            />

            {/* Map Legend Overlay */}
            <div className="absolute bottom-12 left-2 z-20 flex flex-col gap-1.5 p-2 rounded-xl bg-slate-950/90 border border-slate-800/80 text-[9px] font-mono text-slate-200 pointer-events-none shadow-lg">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00F2FF]" />
                <span>Robot (●)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-0.5 bg-[#ffffff]" />
                <span>Arah Hadap</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 flex items-center justify-center text-[#FF0055] font-bold text-[10px]">⌖</span>
                <span>Target Pin</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-0.5 border-t border-dashed border-[#00F2FF]" />
                <span>Jalur A*</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF0055]" />
                <span>LiDAR Scan</span>
              </div>
            </div>

            {/* Grid Bounding Box Labels (Meters) */}
            <span className="absolute top-2 right-2 text-[9px] font-mono text-slate-400 z-20 pointer-events-none">
              Y+ ({bounds.maxY.toFixed(1)}m)
            </span>
            <span className="absolute bottom-2 right-2 text-[9px] font-mono text-slate-400 z-20 pointer-events-none">
              Y- ({bounds.minY.toFixed(1)}m)
            </span>
            <span className="absolute bottom-2 left-2 text-[9px] font-mono text-slate-400 z-20 pointer-events-none">
              X- ({bounds.minX.toFixed(1)}m)
            </span>
            <span className="absolute top-2 left-2 text-[9px] font-mono text-slate-400 z-20 pointer-events-none">
              X+ ({bounds.maxX.toFixed(1)}m)
            </span>
          </div>
        </div>

        {/* Sidebar Info Panel */}
        <div
          className="p-4 lg:px-5 lg:py-6 flex flex-col justify-between gap-4 lg:gap-6 shrink-0 lg:w-80 border-t lg:border-t-0 lg:border-l"
          style={{ background: C.bgAlt, borderColor: `${C.neon}18` }}
        >
          <div className="space-y-4 overflow-y-auto pr-1">
            <div className="space-y-1">
              <h3 className="text-xs lg:text-sm font-bold text-slate-200 uppercase tracking-wider">Navigasi Rute Otomatis</h3>
              <p className="text-[11px] lg:text-xs text-slate-300">
                Tentukan target koordinat perjalanan robot pada area 2D <span className="hidden lg:inline">di sebelah kiri</span><span className="lg:hidden">di atas</span>.
              </p>
            </div>

            {/* ROSBridge Connection Settings Card */}
            <div className="p-3 lg:p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2.5">
              <div className="flex justify-between items-center text-[10px] lg:text-xs">
                <span className="text-slate-300 font-semibold flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5" style={{ color: C.neon }} />
                  ROSBridge WebSocket
                </span>
                <span className={cn(
                  "text-[8px] lg:text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border",
                  connStatus === "connected" && "bg-emerald-950 text-emerald-300 border-emerald-500",
                  connStatus === "connecting" && "bg-amber-950 text-amber-300 border-amber-500 animate-pulse",
                  connStatus === "disconnected" && "bg-slate-800 text-slate-100 border-slate-600"
                )}>
                  {connStatus}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={wsUrl}
                  onChange={(e) => setWsUrl(e.target.value)}
                  disabled={connStatus !== "disconnected"}
                  placeholder="ws://192.168.1.100:9090"
                  className="flex-1 bg-black/40 border border-slate-800 rounded-lg px-2 py-1 text-[11px] font-mono text-white outline-none focus:border-cyan-500/50 disabled:opacity-60"
                />
                <button
                  onClick={handleToggleConnect}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all duration-200 border-0 cursor-pointer min-h-[30px]",
                    connStatus === "disconnected" 
                      ? "bg-cyan-500 hover:bg-cyan-400 text-black" 
                      : "bg-red-500/20 hover:bg-red-500/35 text-red-200"
                  )}
                >
                  {connStatus === "disconnected" ? "Connect" : "Stop"}
                </button>
              </div>
            </div>

            {/* Coordinates Display Card */}
            <div className="p-3 lg:p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2 lg:space-y-3">
              <div className="flex justify-between items-center text-[10px] lg:text-xs">
                <span className="text-slate-200 font-mono font-semibold">Coordinate (Meter)</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-slate-800 border border-slate-700 text-slate-300 uppercase font-sans">
                  Origin: (0.0, 0.0)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-1.5 lg:p-2 rounded-lg bg-black/30 border border-slate-800">
                  <label htmlFor="target-x-input" className="text-[9px] lg:text-[10px] text-slate-300 font-bold uppercase block mb-1">
                    Target X
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="target-x-input"
                      type="number"
                      step="0.01"
                      placeholder="—"
                      value={inputX}
                      onChange={(e) => handleXInputChange(e.target.value)}
                      className="w-full bg-black/50 border border-slate-800 rounded px-2 py-1 text-xs lg:text-sm font-mono font-bold text-white text-center outline-none focus:border-cyan-500/50 transition-colors"
                    />
                    <span className="absolute right-2 text-[10px] text-slate-500 pointer-events-none">m</span>
                  </div>
                </div>
                <div className="p-1.5 lg:p-2 rounded-lg bg-black/30 border border-slate-800">
                  <label htmlFor="target-y-input" className="text-[9px] lg:text-[10px] text-slate-300 font-bold uppercase block mb-1">
                    Target Y
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="target-y-input"
                      type="number"
                      step="0.01"
                      placeholder="—"
                      value={inputY}
                      onChange={(e) => handleYInputChange(e.target.value)}
                      className="w-full bg-black/50 border border-slate-800 rounded px-2 py-1 text-xs lg:text-sm font-mono font-bold text-white text-center outline-none focus:border-cyan-500/50 transition-colors"
                    />
                    <span className="absolute right-2 text-[10px] text-slate-500 pointer-events-none">m</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Instruction Alert (Collapsible details element for better mobile UX) */}
            <details
              open={isInstructionsOpen}
              onToggle={(e) => setIsInstructionsOpen(e.currentTarget.open)}
              className="group p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-[10px] text-slate-300 select-none transition-all duration-200"
            >
              <summary className="font-bold text-slate-200 cursor-pointer flex items-center justify-between outline-none min-h-[44px] py-1 select-none">
                <span className="flex items-center gap-1">💡 Petunjuk Penggunaan</span>
                <span className="transition-transform duration-200 text-[8px] text-slate-400 group-open:rotate-180">▼</span>
              </summary>
              <ol className="list-decimal list-inside mt-2 space-y-1.5 text-justify leading-relaxed">
                <li>Klik pada area grid koordinat <span className="hidden lg:inline">di sebelah kiri</span><span className="lg:hidden">di atas</span> atau isi koordinat di atas secara manual menggunakan keyboard.</li>
                <li>Target koordinat (X, Y) dalam meter terhitung otomatis berdasarkan pusat titik awal (0.0, 0.0).</li>
                <li>Klik tombol <span className="text-cyan-400 font-semibold">Kirim Navigasi (A*)</span> di bawah untuk mengirim data ke robot (Orange Pi). Robot akan otomatis merencanakan rute terpendek yang aman menghindari rintangan (menggunakan ROS 2 Nav2).</li>
              </ol>
            </details>
          </div>

          <div className="space-y-2 lg:space-y-3 mt-auto pt-2 border-t border-slate-800/50">
            {/* Status alerts */}
            {sentStatus === "success" && (
              <div className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-800/80 text-emerald-300 text-[11px] font-mono text-center font-bold">
                ✓ Navigasi terkirim ke Orange Pi!
              </div>
            )}
            {sentStatus === "error" && (
              <div className="p-2.5 rounded-lg bg-red-950/50 border border-red-800/85 text-red-300 text-[11px] font-mono text-center font-bold">
                ✗ Gagal mengirim koordinat.
              </div>
            )}

            {/* Action buttons */}
            <button
              onClick={handleSendGoal}
              disabled={!selectedPoint || isSending}
              className={cn(
                "w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-xs lg:text-sm tracking-wide transition-all duration-200 border-0 min-h-[44px]",
                selectedPoint
                  ? "bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/25 cursor-pointer"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
              )}
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Mengirim Rute...
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5 fill-current" />
                  Kirim Navigasi (A*)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
