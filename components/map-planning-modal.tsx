"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, X, Navigation, RefreshCw, Wifi, WifiOff, Radio, CheckCircle2, XCircle, Loader2, Plus, Minus, Maximize } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  sendNavGoal,
  setNavigationMode,
  listenToDeviceStatus,
  listenToMapGrid,
  listenToScanPoints,
  listenToMapPath,
  listenToRobotPose,
} from "@/lib/firebase-data";
import type { MapGridData, ScanPointsData, MapPathData, RobotPose } from "@/lib/firebase-data";

const C = {
  bg: "#0B0E14",
  bgAlt: "#0D1117",
  fill: "#152238",
  neon: "#00F2FF",
  redNeon: "#FF0055",
  // Map cell palette
  mapFree: [11, 14, 20],        // Dark (explored free space)
  mapObstacle: [56, 189, 248],  // Cyan (walls/obstacles)
  mapUnknown: [21, 28, 38],     // Dark blue (unexplored)
  mapBorder: [0, 229, 255],     // Neon cyan (frontier edge)
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // States for manual input synchronization
  const [inputX, setInputX] = useState("");
  const [inputY, setInputY] = useState("");

  // Navigation status from Firebase
  const [navStatus, setNavStatus] = useState<string>("IDLE");

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
  const [bounds, setBounds] = useState({ minX: -10.0, maxX: 10.0, minY: -10.0, maxY: 10.0 });

  // Data source indicator
  const [mapSource, setMapSource] = useState<"none" | "firebase" | "rosbridge">("none");

  // Canvas and Draw State Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const boundsRef = useRef(bounds);
  const selectedPointRef = useRef(selectedPoint);
  const poseRef = useRef<{ x: number; y: number; yaw: number } | null>(null);
  const scansRef = useRef<{ x: number; y: number }[]>([]);
  const pathRef = useRef<{ x: number; y: number }[]>([]);
  const mapMetadataRef = useRef<{ minX: number; maxX: number; minY: number; maxY: number } | null>(null);

  // Zoom & Pan state (camera transform)
  const zoomRef = useRef(1.0);          // zoom level (1 = fit view)
  const panRef = useRef({ x: 0, y: 0 }); // pan offset in canvas pixels
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panStartOffsetRef = useRef({ x: 0, y: 0 });
  const hasAutoFittedRef = useRef(false);

  // ROS Subscription Refs
  const rosInstanceRef = useRef<any>(null);
  const mapSubRef = useRef<any>(null);
  const odomSubRef = useRef<any>(null);
  const scanSubRef = useRef<any>(null);
  const planSubRef = useRef<any>(null);

  // Sync refs to state changes
  useEffect(() => {
    boundsRef.current = bounds;
  }, [bounds]);

  useEffect(() => {
    selectedPointRef.current = selectedPoint;
  }, [selectedPoint]);

  const connStatusRef = useRef(connStatus);
  useEffect(() => {
    connStatusRef.current = connStatus;
  }, [connStatus]);

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

    poseRef.current = null;
    scansRef.current = [];
    pathRef.current = [];
    offscreenCanvasRef.current = null;
    mapMetadataRef.current = null;
    
    setBounds({ minX: -10.0, maxX: 10.0, minY: -10.0, maxY: 10.0 });
    setConnStatus("disconnected");
    setMapSource((prev) => prev === "rosbridge" ? "none" : prev);
    // Reset zoom/pan
    zoomRef.current = 1.0;
    panRef.current = { x: 0, y: 0 };
    hasAutoFittedRef.current = false;
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
        setMapSource("rosbridge");

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
          
          mapMetadataRef.current = { minX, maxX, minY, maxY };

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
            const data = message.data;

            const isUnexplored = (r: number, c: number) => {
              if (r < 0 || r >= height || c < 0 || c >= width) return true;
              return data[r * width + c] === -1;
            };

            const isFreeSpace = (r: number, c: number) => {
              if (r < 0 || r >= height || c < 0 || c >= width) return false;
              const val = data[r * width + c];
              return val !== -1 && val < 50;
            };

            const isBoundary = (r: number, c: number) => {
              if (!isFreeSpace(r, c)) return false;
              // Check all 8 neighbors to ensure the boundary line is fully connected diagonally
              return isUnexplored(r - 1, c) || 
                     isUnexplored(r + 1, c) || 
                     isUnexplored(r, c - 1) || 
                     isUnexplored(r, c + 1) ||
                     isUnexplored(r - 1, c - 1) ||
                     isUnexplored(r - 1, c + 1) ||
                     isUnexplored(r + 1, c - 1) ||
                     isUnexplored(r + 1, c + 1);
            };

            const isOccupied = (r: number, c: number) => {
              if (r < 0 || r >= height || c < 0 || c >= width) return false;
              return data[r * width + c] >= 65;
            };

            const hasOccupiedNeighbor = (r: number, c: number) => {
              for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                  if (dr === 0 && dc === 0) continue;
                  if (isOccupied(r + dr, c + dc)) return true;
                }
              }
              return false;
            };

            for (let i = 0; i < data.length; i++) {
              const val = data[i];
              const col = i % width;
              const row = Math.floor(i / width);
              const flippedRow = height - 1 - row;
              const destIndex = (flippedRow * width + col) * 4;

              if (val === -1) {
                // Unknown / Unexplored — medium gray
                imgData.data[destIndex] = C.mapUnknown[0];
                imgData.data[destIndex + 1] = C.mapUnknown[1];
                imgData.data[destIndex + 2] = C.mapUnknown[2];
                imgData.data[destIndex + 3] = 255;
              } else if (val >= 65 && hasOccupiedNeighbor(row, col)) {
                // Obstacle / Wall — near-black
                imgData.data[destIndex] = C.mapObstacle[0];
                imgData.data[destIndex + 1] = C.mapObstacle[1];
                imgData.data[destIndex + 2] = C.mapObstacle[2];
                imgData.data[destIndex + 3] = 255;
              } else if (isBoundary(row, col)) {
                // Frontier border — subtle steel blue
                imgData.data[destIndex] = C.mapBorder[0];
                imgData.data[destIndex + 1] = C.mapBorder[1];
                imgData.data[destIndex + 2] = C.mapBorder[2];
                imgData.data[destIndex + 3] = 255;
              } else {
                // Free space — light gray
                imgData.data[destIndex] = C.mapFree[0];
                imgData.data[destIndex + 1] = C.mapFree[1];
                imgData.data[destIndex + 2] = C.mapFree[2];
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

  // ═══════════════════════════════════════════════════════════════════════════
  // FIREBASE FALLBACK: Subscribe to map data from Firebase when ROSBridge
  // is not connected. This enables real-time mapping from anywhere.
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!isOpen) return;

    // Only use Firebase map data when ROSBridge is NOT connected
    if (connStatus === "connected") return;

    // Subscribe to Firebase map grid data
    const unsubGrid = listenToMapGrid(
      (gridData: MapGridData) => {
        if (connStatusRef.current === "connected") return;
        setMapSource("firebase");
        const { width, height, resolution, origin_x, origin_y, data_b64 } = gridData;

        // Calculate bounds from map metadata
        const minX = origin_x;
        const maxX = origin_x + width * resolution;
        const minY = origin_y;
        const maxY = origin_y + height * resolution;
        mapMetadataRef.current = { minX, maxX, minY, maxY };

        // Decode base64 occupancy grid and render to offscreen canvas
        try {
          const binaryStr = atob(data_b64);
          const cells = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            cells[i] = binaryStr.charCodeAt(i);
          }

          if (!offscreenCanvasRef.current) {
            offscreenCanvasRef.current = document.createElement("canvas");
          }
          const offCanvas = offscreenCanvasRef.current;
          offCanvas.width = width;
          offCanvas.height = height;
          const ctx = offCanvas.getContext("2d");
          if (ctx) {
            const imgData = ctx.createImageData(width, height);

            const getVal = (r: number, c: number) => {
              if (r < 0 || r >= height || c < 0 || c >= width) return -1;
              return cells[r * width + c] - 128;
            };

            const isUnexplored = (r: number, c: number) => {
              return getVal(r, c) === -1;
            };

            const isFreeSpace = (r: number, c: number) => {
              const val = getVal(r, c);
              return val !== -1 && val < 50;
            };

            const isBoundary = (r: number, c: number) => {
              if (!isFreeSpace(r, c)) return false;
              // Check all 8 neighbors to ensure the boundary line is fully connected diagonally
              return isUnexplored(r - 1, c) || 
                     isUnexplored(r + 1, c) || 
                     isUnexplored(r, c - 1) || 
                     isUnexplored(r, c + 1) ||
                     isUnexplored(r - 1, c - 1) ||
                     isUnexplored(r - 1, c + 1) ||
                     isUnexplored(r + 1, c - 1) ||
                     isUnexplored(r + 1, c + 1);
            };

            const isOccupied = (r: number, c: number) => {
              return getVal(r, c) >= 65;
            };

            const hasOccupiedNeighbor = (r: number, c: number) => {
              for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                  if (dr === 0 && dc === 0) continue;
                  if (isOccupied(r + dr, c + dc)) return true;
                }
              }
              return false;
            };

            for (let i = 0; i < cells.length; i++) {
              // Reverse the encoding: stored as (val + 128), so val = stored - 128
              const val = cells[i] - 128;
              const col = i % width;
              const row = Math.floor(i / width);
              const flippedRow = height - 1 - row;
              const destIndex = (flippedRow * width + col) * 4;

              if (val === -1) {
                // Unknown / Unexplored — medium gray
                imgData.data[destIndex] = C.mapUnknown[0];
                imgData.data[destIndex + 1] = C.mapUnknown[1];
                imgData.data[destIndex + 2] = C.mapUnknown[2];
                imgData.data[destIndex + 3] = 255;
              } else if (val >= 65 && hasOccupiedNeighbor(row, col)) {
                // Obstacle / Wall — near-black
                imgData.data[destIndex] = C.mapObstacle[0];
                imgData.data[destIndex + 1] = C.mapObstacle[1];
                imgData.data[destIndex + 2] = C.mapObstacle[2];
                imgData.data[destIndex + 3] = 255;
              } else if (isBoundary(row, col)) {
                // Frontier border — subtle steel blue
                imgData.data[destIndex] = C.mapBorder[0];
                imgData.data[destIndex + 1] = C.mapBorder[1];
                imgData.data[destIndex + 2] = C.mapBorder[2];
                imgData.data[destIndex + 3] = 255;
              } else {
                // Free space — light gray
                imgData.data[destIndex] = C.mapFree[0];
                imgData.data[destIndex + 1] = C.mapFree[1];
                imgData.data[destIndex + 2] = C.mapFree[2];
                imgData.data[destIndex + 3] = 255;
              }
            }
            ctx.putImageData(imgData, 0, 0);
          }
        } catch (e) {
          console.error("[Firebase Map] Failed to decode grid data:", e);
        }
      },
      (error) => console.error("[Firebase Map Grid] error:", error)
    );

    // Subscribe to Firebase scan points
    const unsubScan = listenToScanPoints(
      (data: ScanPointsData) => {
        if (connStatusRef.current === "connected") return;
        scansRef.current = data.points;
      },
      (error) => console.error("[Firebase Scan Points] error:", error)
    );

    // Subscribe to Firebase A* path
    const unsubPath = listenToMapPath(
      (data: MapPathData) => {
        if (connStatusRef.current === "connected") return;
        pathRef.current = data.points;
      },
      (error) => console.error("[Firebase Map Path] error:", error)
    );

    // Subscribe to Firebase robot pose
    const unsubPose = listenToRobotPose(
      (pose: RobotPose) => {
        if (connStatusRef.current === "connected") return;
        poseRef.current = { x: pose.x, y: pose.y, yaw: pose.yaw };
      },
      (error) => console.error("[Firebase Robot Pose] error:", error)
    );

    return () => {
      unsubGrid();
      unsubScan();
      unsubPath();
      unsubPose();
    };
  }, [isOpen, connStatus]);

  // Subscribe to device status (Firebase) for position fallback and navigation status
  useEffect(() => {
    const unsubscribeStatus = listenToDeviceStatus(
      (status) => {
        // Update navigation status display
        if (status.navigation_status) {
          setNavStatus(status.navigation_status);
        }

        // Fallback to Firebase status values if not connected via websocket
        if (connStatusRef.current !== "connected") {
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
  }, []);

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

      // HiDPI support
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const W = displayWidth;
      const H = displayHeight;

      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);
      const b = boundsRef.current;
      const zoom = zoomRef.current;
      const pan = panRef.current;

      const mapToCanvas = (mx: number, my: number) => {
        const pctX = (mx - b.minX) / (b.maxX - b.minX);
        const pctY = (my - b.minY) / (b.maxY - b.minY);
        return {
          x: pctX * W * zoom + pan.x,
          y: (1 - pctY) * H * zoom + pan.y,
        };
      };

      // 1. Draw Map Background (RViz-style)
      if (offscreenCanvasRef.current && mapMetadataRef.current) {
        const meta = mapMetadataRef.current;
        const topLeft = mapToCanvas(meta.minX, meta.maxY);
        const bottomRight = mapToCanvas(meta.maxX, meta.minY);

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          offscreenCanvasRef.current,
          topLeft.x,
          topLeft.y,
          bottomRight.x - topLeft.x,
          bottomRight.y - topLeft.y
        );
        ctx.restore();
      }

      // Subtle meter grid overlay
      ctx.save();
      ctx.font = "bold 9px monospace";
      ctx.textBaseline = "middle";

      for (let x = Math.ceil(b.minX); x <= Math.floor(b.maxX); x++) {
        const ptCanvas = mapToCanvas(x, 0);
        ctx.strokeStyle = x === 0 ? "rgba(0, 242, 255, 0.15)" : "rgba(0, 242, 255, 0.06)";
        ctx.lineWidth = x === 0 ? 1 : 0.5;
        ctx.beginPath();
        ctx.moveTo(ptCanvas.x, 0);
        ctx.lineTo(ptCanvas.x, canvas.height);
        ctx.stroke();
        if (x !== 0) {
          ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
          ctx.textAlign = "center";
          ctx.fillText(`${x}m`, ptCanvas.x, canvas.height - 14);
        }
      }

      for (let y = Math.ceil(b.minY); y <= Math.floor(b.maxY); y++) {
        const ptCanvas = mapToCanvas(0, y);
        ctx.strokeStyle = y === 0 ? "rgba(0, 242, 255, 0.15)" : "rgba(0, 242, 255, 0.06)";
        ctx.lineWidth = y === 0 ? 1 : 0.5;
        ctx.beginPath();
        ctx.moveTo(0, ptCanvas.y);
        ctx.lineTo(canvas.width, ptCanvas.y);
        ctx.stroke();
        if (y !== 0) {
          ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
          ctx.textAlign = "left";
          ctx.fillText(`${y}m`, 6, ptCanvas.y);
        }
      }
      ctx.restore();
      // 2. Origin axes
      const originCanvas = mapToCanvas(0, 0);
      if (originCanvas.x >= 0 && originCanvas.x <= canvas.width && originCanvas.y >= 0 && originCanvas.y <= canvas.height) {
        ctx.save();
        // X axis (Red)
        ctx.strokeStyle = "#FF0055";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(originCanvas.x, originCanvas.y);
        ctx.lineTo(originCanvas.x + 24, originCanvas.y);
        ctx.stroke();
        // Y axis (Green)
        ctx.strokeStyle = "#10B981";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(originCanvas.x, originCanvas.y);
        ctx.lineTo(originCanvas.x, originCanvas.y - 24);
        ctx.stroke();
        // Origin dot
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(originCanvas.x, originCanvas.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 3. A* Path Line
      const path = pathRef.current;
      if (path && path.length > 0) {
        ctx.save();
        ctx.strokeStyle = "#00F2FF";
        ctx.lineWidth = 2;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.setLineDash([6, 4]);
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
        ctx.setLineDash([]);

        // Path endpoint marker
        if (path.length > 0) {
          const endPt = mapToCanvas(path[path.length - 1].x, path[path.length - 1].y);
          ctx.fillStyle = "#00F2FF";
          ctx.beginPath();
          ctx.arc(endPt.x, endPt.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 4. LiDAR Scan Dots
      const scans = scansRef.current;
      if (scans && scans.length > 0) {
        ctx.save();
        ctx.fillStyle = "#FF0055";
        for (const pt of scans) {
          const cPt = mapToCanvas(pt.x, pt.y);
          ctx.fillRect(cPt.x - 1, cPt.y - 1, 2, 2);
        }
        ctx.restore();
      }

      // 5. Robot Pose
      const pose = poseRef.current;
      if (pose) {
        const cPose = mapToCanvas(pose.x, pose.y);
        ctx.save();
        ctx.translate(cPose.x, cPose.y);
        ctx.rotate(-pose.yaw);
        // Arrow body
        ctx.fillStyle = "#00F2FF";
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(-8, -7);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-8, 7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // 6. Selected Target Pin (clean crosshair)
      const selected = selectedPointRef.current;
      if (selected) {
        const cTarget = mapToCanvas(selected.x, selected.y);
        ctx.save();
        // Outer pulsing ring
        const pulse = 1 + Math.sin(Date.now() / 200) * 0.12;
        ctx.strokeStyle = "rgba(255, 0, 85, 0.5)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cTarget.x, cTarget.y, 10 * pulse, 0, Math.PI * 2);
        ctx.stroke();
        // Inner solid ring
        ctx.strokeStyle = "#FF0055";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cTarget.x, cTarget.y, 5, 0, Math.PI * 2);
        ctx.stroke();
        // Center dot
        ctx.fillStyle = "#FF0055";
        ctx.beginPath();
        ctx.arc(cTarget.x, cTarget.y, 2, 0, Math.PI * 2);
        ctx.fill();
        // Crosshair lines
        ctx.strokeStyle = "rgba(255, 0, 85, 0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cTarget.x - 16, cTarget.y);
        ctx.lineTo(cTarget.x - 7, cTarget.y);
        ctx.moveTo(cTarget.x + 7, cTarget.y);
        ctx.lineTo(cTarget.x + 16, cTarget.y);
        ctx.moveTo(cTarget.x, cTarget.y - 16);
        ctx.lineTo(cTarget.x, cTarget.y - 7);
        ctx.moveTo(cTarget.x, cTarget.y + 7);
        ctx.lineTo(cTarget.x, cTarget.y + 16);
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
        setIsInstructionsOpen(false);
      }
    }
  }, [isOpen]);

  // Clean up ROS connection only when component unmounts
  useEffect(() => {
    return () => {
      disconnectRos();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isOpen) return null;

  const handleGridClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Ignore click if user was panning
    if (isPanningRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const zoom = zoomRef.current;
    const pan = panRef.current;
    const W = rect.width;
    const H = rect.height;

    const b = boundsRef.current;
    const pctX = (clickX - pan.x) / (W * zoom);
    const pctY = (clickY - pan.y) / (H * zoom);

    const xMeters = b.minX + pctX * (b.maxX - b.minX);
    const yMeters = b.maxY - pctY * (b.maxY - b.minY);

    setSelectedPoint({
      x: Math.round(xMeters * 100) / 100,
      y: Math.round(yMeters * 100) / 100,
    });
    setSentStatus("idle");
  };

  // Zoom handlers (click-based)
  const handleZoomIn = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const oldZoom = zoomRef.current;
    const newZoom = Math.min(oldZoom * 1.5, 20);

    const pan = panRef.current;
    panRef.current = {
      x: centerX - (centerX - pan.x) * (newZoom / oldZoom),
      y: centerY - (centerY - pan.y) * (newZoom / oldZoom),
    };
    zoomRef.current = newZoom;
  };

  const handleZoomOut = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const oldZoom = zoomRef.current;
    const newZoom = Math.max(oldZoom / 1.5, 0.3);

    const pan = panRef.current;
    panRef.current = {
      x: centerX - (centerX - pan.x) * (newZoom / oldZoom),
      y: centerY - (centerY - pan.y) * (newZoom / oldZoom),
    };
    zoomRef.current = newZoom;
  };

  // Pan handlers (mouse drag)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0 || e.button === 1) {
      isPanningRef.current = false;
      panStartRef.current = { x: e.clientX, y: e.clientY };
      panStartOffsetRef.current = { ...panRef.current };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.buttons === 0) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      isPanningRef.current = true;
    }
    panRef.current = {
      x: panStartOffsetRef.current.x + dx,
      y: panStartOffsetRef.current.y + dy,
    };
  };

  const handleMouseUp = () => {
    // Small delay to prevent click from firing after pan
    setTimeout(() => { isPanningRef.current = false; }, 50);
  };

  // Reset zoom/pan
  const handleResetView = () => {
    zoomRef.current = 1.0;
    panRef.current = { x: 0, y: 0 };
  };

  const handleSendGoal = async () => {
    if (!selectedPoint) return;
    setIsSending(true);
    setSentStatus("idle");
    try {
      // Send target coordinates to Firebase -> bridge reads -> Nav2 Action Client
      // This is the ONLY correct path for Nav2 A* path planning.
      // The bridge uses NavigateToPose action interface which properly triggers
      // the full Nav2 planning + control pipeline (A* global planner + DWB local planner).
      await sendNavGoal(selectedPoint.x, selectedPoint.y);
      console.log("[MapPlanning] Sent nav goal via Firebase:", selectedPoint);

      setSentStatus("success");
    } catch (err) {
      console.error("[MapPlanning] Failed to send nav goal:", err);
      setSentStatus("error");
    } finally {
      setIsSending(false);
    }
  };

  // Navigation status helpers
  const getNavStatusDisplay = () => {
    switch (navStatus) {
      case "IDLE": return { label: "Menunggu", color: "text-slate-400", icon: null, bgColor: "bg-slate-800/50" };
      case "SENDING_GOAL": return { label: "Mengirim Goal...", color: "text-amber-300", icon: <Loader2 className="w-3 h-3 animate-spin" />, bgColor: "bg-amber-950/50" };
      case "NAVIGATING": return { label: "Robot Bergerak", color: "text-cyan-300", icon: <Navigation className="w-3 h-3 animate-pulse" />, bgColor: "bg-cyan-950/50" };
      case "SUCCEEDED": return { label: "Sampai Tujuan!", color: "text-emerald-300", icon: <CheckCircle2 className="w-3 h-3" />, bgColor: "bg-emerald-950/50" };
      case "ABORTED": return { label: "Navigasi Gagal", color: "text-red-300", icon: <XCircle className="w-3 h-3" />, bgColor: "bg-red-950/50" };
      case "CANCELED": return { label: "Dibatalkan", color: "text-orange-300", icon: <XCircle className="w-3 h-3" />, bgColor: "bg-orange-950/50" };
      case "REJECTED": return { label: "Goal Ditolak", color: "text-red-300", icon: <XCircle className="w-3 h-3" />, bgColor: "bg-red-950/50" };
      case "SERVER_UNAVAILABLE": return { label: "Nav2 Offline", color: "text-red-400", icon: <WifiOff className="w-3 h-3" />, bgColor: "bg-red-950/50" };
      default: return { label: navStatus, color: "text-slate-300", icon: null, bgColor: "bg-slate-800/50" };
    }
  };

  const navStatusDisplay = getNavStatusDisplay();

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
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Interactive Grid Map */}
        <div className="flex-1 w-full min-h-[35vh] lg:min-h-0 relative flex items-center justify-center p-4 lg:p-6 select-none bg-slate-950/20">
          <div className="relative w-full max-w-[400px] lg:max-w-[480px] aspect-square rounded-2xl border border-slate-800 bg-black/40 overflow-hidden shadow-2xl">
            {/* HTML5 Map Canvas */}
            <canvas
              ref={canvasRef}
              onClick={handleGridClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="absolute inset-0 w-full h-full cursor-crosshair object-contain z-10"
              style={{ touchAction: "none" }}
            />

            {/* Data Source Badge */}
            <div className={cn(
              "absolute top-2 left-2 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border",
              mapSource === "rosbridge" && "bg-emerald-950/80 text-emerald-300 border-emerald-500/50",
              mapSource === "firebase" && "bg-cyan-950/80 text-cyan-300 border-cyan-500/50",
              mapSource === "none" && "bg-slate-900/80 text-slate-400 border-slate-700/50",
            )}>
              {mapSource === "rosbridge" && <><Wifi className="w-2.5 h-2.5" /> ROSBridge Live</>}
              {mapSource === "firebase" && <><Radio className="w-2.5 h-2.5" /> Firebase Live</>}
              {mapSource === "none" && <><WifiOff className="w-2.5 h-2.5" /> No Data</>}
            </div>

            {/* Zoom Controls */}
            <div className="absolute right-2 top-2 z-20 flex flex-col gap-1">
              <button 
                onClick={handleZoomIn}
                className="w-7 h-7 flex items-center justify-center bg-slate-900/80 border border-slate-700/50 rounded hover:bg-slate-800 transition-colors text-slate-300"
                title="Zoom In"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button 
                onClick={handleZoomOut}
                className="w-7 h-7 flex items-center justify-center bg-slate-900/80 border border-slate-700/50 rounded hover:bg-slate-800 transition-colors text-slate-300"
                title="Zoom Out"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button 
                onClick={handleResetView}
                className="w-7 h-7 flex items-center justify-center bg-slate-900/80 border border-slate-700/50 rounded hover:bg-slate-800 transition-colors text-slate-300 mt-1"
                title="Reset View"
              >
                <Maximize className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Map Legend Overlay */}
            <div className="absolute bottom-12 left-2 z-20 flex flex-col gap-1 p-2 rounded-lg bg-slate-950/90 border border-slate-800/80 text-[9px] font-mono text-slate-200 pointer-events-none shadow-lg backdrop-blur-sm">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "rgb(11, 14, 20)" }} />
                <span>Free Space</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#38BDF8]" />
                <span>Obstacle</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "rgb(21, 28, 38)" }} />
                <span>Unknown</span>
              </div>
              <div className="w-full h-px bg-slate-700/50 my-0.5" />
              <div className="flex items-center gap-1.5">
                <span className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[7px] border-l-[#00F2FF]" />
                <span>Robot</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 flex items-center justify-center text-[#FF0055] font-bold text-[10px]">⌖</span>
                <span>Target</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-0.5 border-t border-dashed border-[#00F2FF]" />
                <span>Path A*</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-[#FF0055]" />
                <span>LiDAR</span>
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
          </div>
        </div>

        {/* Sidebar Info Panel */}
        <div
          className="p-4 lg:px-5 lg:py-6 flex flex-col justify-between gap-4 lg:gap-6 shrink-0 lg:w-80 border-t lg:border-t-0 lg:border-l overflow-hidden"
          style={{ background: C.bgAlt, borderColor: `${C.neon}18` }}
        >
          <div className="flex-1 min-h-0 space-y-4 overflow-y-auto pr-1">
            <div className="space-y-1">
              <h3 className="text-xs lg:text-sm font-bold text-slate-200 uppercase tracking-wider">Navigasi Rute Otomatis</h3>
              <p className="text-[11px] lg:text-xs text-slate-300">
                Tentukan target koordinat perjalanan robot pada area 2D <span className="hidden lg:inline">di sebelah kiri</span><span className="lg:hidden">di atas</span>.
              </p>
            </div>

            {/* Navigation Status Display */}
            <div className={cn(
              "p-2.5 rounded-lg border flex items-center gap-2 transition-all",
              navStatusDisplay.bgColor,
              navStatus === "NAVIGATING" ? "border-cyan-500/40" : "border-slate-800/80",
            )}>
              {navStatusDisplay.icon}
              <div className="flex-1">
                <div className="text-[9px] text-slate-400 font-bold uppercase">Status Navigasi</div>
                <div className={cn("text-[11px] font-bold", navStatusDisplay.color)}>
                  {navStatusDisplay.label}
                </div>
              </div>
              {navStatus === "NAVIGATING" && (
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              )}
            </div>

            {/* Toggle Button for Connection & Coordinates manual inputs on Mobile */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="w-full lg:hidden py-2 px-3 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 text-[11px] font-bold text-slate-300 transition-all flex items-center justify-between min-h-[40px] cursor-pointer"
            >
              <span>Koneksi & Koordinat Manual</span>
              <span className="text-[9px] text-cyan-400 font-mono">
                {isSettingsOpen ? "▲ Sembunyikan" : "▼ Tampilkan"}
              </span>
            </button>

            {/* Collapsible Container */}
            <div className={cn("space-y-3", !isSettingsOpen && "hidden lg:block")}>
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
                {connStatus === "disconnected" && (
                  <p className="text-[9px] text-slate-500 italic">
                    Tanpa ROSBridge, peta tetap ditampilkan via Firebase (update ~5 detik)
                  </p>
                )}
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
            </div>

            {/* Instruction Alert */}
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
                <li>Peta dan jalur A* akan ditampilkan secara <span className="text-cyan-400 font-semibold">real-time</span> di grid, baik melalui ROSBridge maupun Firebase.</li>
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