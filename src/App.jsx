import { useEffect, useRef, useState } from "react";
import "./App.css";

const W = 900;
const H = 600;
const KEY = "blackhole-best";
const MAXR = 64;

const getBest = () => {
  try {
    return Number(localStorage.getItem(KEY) || 0);
  } catch {
    return 0;
  }
};

export default function App() {
  const ref = useRef(null);
  const [screen, setScreen] = useState("menu");
  const [res, setRes] = useState({ score: 0, level: 1 });
  const [best, setBest] = useState(getBest);

  useEffect(() => {
    if (screen !== "play") return;
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const rand = (a, b) => Math.random() * (b - a) + a;
    const m = { x: W / 2, y: H / 2 };

    const s = {
      h: { x: W / 2, y: H / 2, r: 22 },
      objs: [],
      parts: [],
      stars: [],
      score: 0,
      level: 1,
      t: 0,
      spawn: 0,
      banner: 100,
      shake: 0,
      over: false,
      overT: 0,
      done: false,
    };
    for (let i = 0; i < 120; i++) {
      s.stars.push({ x: rand(0, W), y: rand(0, H), z: rand(0.2, 1.5) });
    }

    const burst = (x, y, color, n) => {
      for (let i = 0; i < n; i++) {
        const a = rand(0, Math.PI * 2);
        const sp = rand(1, 6);
        s.parts.push({
          x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: rand(20, 45),
          max: 45,
          color,
          size: rand(1.5, 3.5),
        });
      }
    };

    const spawn = () => {
      if (s.objs.length > 45) return;
      const side = Math.floor(rand(0, 4));
      let x, y;
      if (side === 0) { x = rand(0, W); y = -50; }
      else if (side === 1) { x = W + 50; y = rand(0, H); }
      else if (side === 2) { x = rand(0, W); y = H + 50; }
      else { x = -50; y = rand(0, H); }
      const danger = Math.random() < 0.28;
      const raw = danger ? s.h.r * rand(1.2, 1.9) : s.h.r * rand(0.2, 0.9);
      const r = Math.max(5, Math.min(raw, 140));
      const a = Math.atan2(H / 2 + rand(-150, 150) - y, W / 2 + rand(-250, 250) - x);
      const sp = rand(0.6, 1.5) + s.level * 0.2;
      s.objs.push({
        x, y, r,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        seed: Math.random(),
        danger: false,
        dead: false,
      });
    };

    const die = () => {
      s.over = true;
      s.overT = 55;
      s.shake = 25;
      burst(s.h.x, s.h.y, "#ffffff", 80);
      try {
        const b = Number(localStorage.getItem(KEY) || 0);
        if (s.score > b) localStorage.setItem(KEY, String(s.score));
      } catch {
        /* ignore */
      }
    };

    const update = (dt) => {
      s.t += dt;
      for (const st of s.stars) {
        st.y += st.z * 0.3 * dt;
        if (st.y > H) { st.y = 0; st.x = rand(0, W); }
      }
      for (const q of s.parts) {
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.vx *= Math.pow(0.96, dt);
        q.vy *= Math.pow(0.96, dt);
        q.life -= dt;
      }
      s.parts = s.parts.filter((q) => q.life > 0);
      s.shake = Math.max(0, s.shake - dt);
      s.banner = Math.max(0, s.banner - dt);

      if (s.over) {
        s.overT -= dt;
        if (s.overT <= 0 && !s.done) {
          s.done = true;
          setRes({ score: s.score, level: s.level });
          setBest((p) => Math.max(p, s.score));
          setScreen("over");
        }
        return;
      }

      const h = s.h;
      const k = 1 - Math.pow(0.85, dt);
      h.x += (m.x - h.x) * k;
      h.y += (m.y - h.y) * k;

      s.spawn -= dt;
      if (s.spawn <= 0) {
        spawn();
        s.spawn = Math.max(8, 30 - s.level * 3) * rand(0.6, 1.2);
      }

      for (const o of s.objs) {
        o.danger = o.r > h.r * 1.05;
        const dx = h.x - o.x;
        const dy = h.y - o.y;
        const d = Math.hypot(dx, dy) || 1;
        if (!o.danger && d < h.r * 4) {
          const f = 0.09 * dt * (1 - d / (h.r * 4));
          o.vx += (dx / d) * f;
          o.vy += (dy / d) * f;
        }
        o.x += o.vx * dt;
        o.y += o.vy * dt;

        if (!o.danger && d < h.r) {
          o.dead = true;
          h.r = Math.sqrt(h.r * h.r + o.r * o.r * 0.35);
          s.score += Math.ceil(o.r);
          burst(o.x, o.y, `hsl(${140 + o.seed * 80},100%,65%)`, 10);
          if (h.r >= MAXR) {
            s.level++;
            s.score += 100 * s.level;
            h.r = 24;
            s.objs = [];
            s.banner = 120;
            s.shake = 18;
            burst(h.x, h.y, "#ffe600", 60);
            return;
          }
        } else if (o.danger && d < h.r + o.r * 0.55) {
          die();
          return;
        }
        if (o.x < -160 || o.x > W + 160 || o.y < -160 || o.y > H + 160) o.dead = true;
      }
      s.objs = s.objs.filter((o) => !o.dead);
    };

    const draw = () => {
      ctx.save();
      ctx.shadowBlur = 0;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#05010f");
      g.addColorStop(1, "#0b0b30");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      if (s.shake > 0) ctx.translate(rand(-1, 1) * s.shake * 0.5, rand(-1, 1) * s.shake * 0.5);

      for (const st of s.stars) {
        ctx.globalAlpha = 0.25 + st.z / 2;
        ctx.fillStyle = "#fff";
        ctx.fillRect(st.x, st.y, st.z + 0.5, st.z + 0.5);
      }
      ctx.globalAlpha = 1;

      for (const o of s.objs) {
        const col = o.danger ? "hsl(350,100%,58%)" : `hsl(${140 + o.seed * 80},100%,60%)`;
        ctx.shadowBlur = 18;
        ctx.shadowColor = col;
        ctx.strokeStyle = col;
        ctx.fillStyle = o.danger ? "rgba(255,40,80,0.28)" : "rgba(0,255,200,0.18)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      if (!s.over) {
        const h = s.h;
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.r * 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        for (let i = 0; i < 3; i++) {
          const c = `hsl(${(s.t * 4 + i * 60) % 360},100%,60%)`;
          ctx.strokeStyle = c;
          ctx.shadowColor = c;
          ctx.shadowBlur = 28;
          ctx.lineWidth = 4 - i;
          ctx.beginPath();
          ctx.arc(h.x, h.y, h.r + 3 + i * 4, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const q of s.parts) {
        ctx.globalAlpha = Math.max(0, q.life / q.max);
        ctx.fillStyle = q.color;
        ctx.fillRect(q.x, q.y, q.size, q.size);
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      // HUD
      ctx.save();
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      ctx.fillStyle = "#fff";
      ctx.font = "bold 20px 'Courier New', monospace";
      ctx.fillText(`BALL ${s.score}`, 16, 28);
      ctx.textAlign = "right";
      ctx.fillStyle = "#00d0ff";
      ctx.fillText(`LEVEL ${s.level}`, W - 16, 28);
      const pr = Math.min(1, (s.h.r - 22) / (MAXR - 22));
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(W / 2 - 120, 14, 240, 10);
      ctx.fillStyle = `hsl(${(s.t * 4) % 360},100%,60%)`;
      ctx.fillRect(W / 2 - 120, 14, 240 * Math.max(0, pr), 10);
      if (s.banner > 0 && !s.over) {
        ctx.globalAlpha = Math.min(1, s.banner / 40);
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 54px 'Courier New', monospace";
        ctx.fillText(`LEVEL ${s.level}`, W / 2, H / 2 - 90);
        ctx.font = "16px 'Courier New', monospace";
        ctx.fillText("Yashillarni yut, qizillardan qoch!", W / 2, H / 2 - 60);
      }
      ctx.restore();
    };

    const pos = (cx, cy) => {
      const r = canvas.getBoundingClientRect();
      m.x = ((cx - r.left) * W) / r.width;
      m.y = ((cy - r.top) * H) / r.height;
    };
    const mm = (e) => pos(e.clientX, e.clientY);
    const tm = (e) => {
      e.preventDefault();
      const t = e.touches[0];
      if (t) pos(t.clientX, t.clientY - 40);
    };

    canvas.addEventListener("mousemove", mm);
    canvas.addEventListener("touchstart", tm, { passive: false });
    canvas.addEventListener("touchmove", tm, { passive: false });

    let raf = 0;
    let last = performance.now();
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      let dt = (now - last) / 16.667;
      last = now;
      if (!(dt >= 0)) dt = 0;
      if (dt > 2.5) dt = 2.5;
      update(dt);
      draw();
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("mousemove", mm);
      canvas.removeEventListener("touchstart", tm);
      canvas.removeEventListener("touchmove", tm);
    };
  }, [screen]);

  const start = () => setScreen("play");

  return (
    <div className="app">
      <h1 className="title">BLACK HOLE</h1>
      <div className="stage">
        <canvas
          ref={ref}
          width={W}
          height={H}
          className={`canvas ${screen === "play" ? "playing" : ""}`}
        />
        {screen === "menu" && (
          <div className="overlay">
            <p className="sub">Hamma narsani yutib o'sing</p>
            <div className="help">
              <span>🖱️ Sichqoncha / barmoq bilan o'pqonni yurgizing</span>
              <span>🟢 Yashil kichik narsalarni yuting, o'sasiz</span>
              <span>🔴 Qizil kattalar sizdan kuchli, tegmang!</span>
              <span>⭐ To'liq o'ssangiz, keyingi level</span>
            </div>
            <p className="best">Rekord: {best}</p>
            <button className="btn" onClick={start}>BOSHLASH</button>
          </div>
        )}
        {screen === "over" && (
          <div className="overlay">
            <h2 className="over">YUTILDINGIZ!</h2>
            <p className="big">Ball: {res.score}</p>
            <p className="sub">Level: {res.level}</p>
            <p className="best">Rekord: {best}</p>
            <button className="btn" onClick={start}>QAYTA O'YNASH</button>
          </div>
        )}
      </div>
    </div>
  );
}