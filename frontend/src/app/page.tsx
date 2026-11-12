
"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import * as THREE from "three";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  BrainCircuit,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Command,
  CreditCard,
  LayoutDashboard,
  Menu,
  Package,
  Receipt,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";

/* =========================================================
   SMARTPOS LANDING PAGE
   Next.js App Router + React + TypeScript + Three.js
========================================================= */

const NAV_LINKS = [
  { label: "Beranda", href: "#home" },
  { label: "Fitur", href: "#features" },
  { label: "Cara Kerja", href: "#workflow" },
  { label: "Tentang", href: "#about" },
];

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "Business Dashboard",
    description:
      "Pantau kondisi bisnis melalui ringkasan penjualan, transaksi, dan aktivitas operasional.",
    details: [
      "Ringkasan omzet, jumlah transaksi, dan laba kotor.",
      "Estimasi hasil operasional setelah dikurangi pengeluaran.",
      "Daftar produk terlaris dengan filter periode laporan.",
    ],
    number: "01",
  },
  {
    icon: CreditCard,
    title: "Point of Sale",
    description:
      "Kelola proses transaksi penjualan melalui sistem kasir yang terintegrasi.",
    details: [
      "Pemilihan produk cepat dengan keranjang transaksi.",
      "Perhitungan total, proses pembayaran, dan struk.",
      "Setiap transaksi otomatis tercatat di histori penjualan.",
    ],
    number: "02",
  },
  {
    icon: Package,
    title: "Product Management",
    description:
      "Kelola daftar produk, harga, dan informasi stok dalam satu tempat.",
    details: [
      "Tambah, ubah, dan nonaktifkan produk.",
      "Pengelolaan harga jual dan jumlah stok.",
      "Pencarian dan kategori untuk mempermudah penataan.",
    ],
    number: "03",
  },
  {
    icon: Receipt,
    title: "Sales Management",
    description:
      "Telusuri riwayat transaksi dan periksa detail setiap penjualan.",
    details: [
      "Riwayat transaksi lengkap dengan detail per item.",
      "Penelusuran penjualan berdasarkan tanggal.",
      "Rekap transaksi yang terjadi selama shift kasir.",
    ],
    number: "04",
  },
  {
    icon: Wallet,
    title: "Expense Tracking",
    description:
      "Catat pengeluaran usaha seperti sewa, utilitas, perlengkapan, dan biaya lainnya.",
    details: [
      "Pencatatan pengeluaran per kategori biaya.",
      "Rekap sewa, utilitas, dan perlengkapan usaha.",
      "Ringkasan pengeluaran untuk laporan operasional.",
    ],
    number: "05",
  },
  {
    icon: BrainCircuit,
    title: "AI Business Assistant",
    description:
      "Bantu memahami informasi bisnis dan mendapatkan insight berdasarkan data yang tersedia.",
    details: [
      "Tanya kondisi bisnis dengan bahasa sehari-hari.",
      "Ringkasan penjualan, pengeluaran, dan skor kesehatan usaha.",
      "Saran tindakan lanjutan berdasarkan data tercatat.",
    ],
    number: "06",
  },
  {
    icon: ShieldCheck,
    title: "Activity Audit",
    description:
      "Telusuri catatan aktivitas untuk membantu memantau perubahan dalam sistem.",
    details: [
      "Catatan aktivitas pengguna dan perubahan data.",
      "Penelusuran berdasarkan jenis aksi dan waktu kejadian.",
      "Membantu menjaga akuntabilitas operasional.",
    ],
    number: "07",
  },
  {
    icon: Users,
    title: "Team Management",
    description:
      "Kelola anggota usaha dengan pembagian peran Owner, Manager, dan Cashier.",
    details: [
      "Undang anggota dengan peran Owner, Manager, atau Cashier.",
      "Pembatasan akses menu sesuai peran masing-masing.",
      "Profil dan status keanggotaan dalam satu daftar.",
    ],
    number: "08",
  },
  {
    icon: Clock3,
    title: "Shift Management",
    description:
      "Catat pembukaan shift, aktivitas transaksi, dan proses penutupan kasir.",
    details: [
      "Pembukaan dan penutupan shift kasir terdokumentasi.",
      "Rekap transaksi selama shift berjalan.",
      "Perbandingan kas awal dan akhir saat tutup shift.",
    ],
    number: "09",
  },
  {
    icon: Command,
    title: "System Settings",
    description:
      "Atur konfigurasi dan preferensi operasional bisnis melalui satu halaman.",
    details: [
      "Profil usaha dan identitas bisnis.",
      "Preferensi tampilan dan tema antarmuka.",
      "Konfigurasi akun dan pengelolaan sesi login.",
    ],
    number: "10",
  },
];

const PREVIEW_TABS = [
  { id: "overview", label: "Overview" },
  { id: "pos", label: "Point of Sale" },
  { id: "products", label: "Products" },
  { id: "assistant", label: "AI Assistant" },
] as const;

type PreviewTab = (typeof PREVIEW_TABS)[number]["id"];

const FAQS = [
  {
    question: "Apa itu SmartPOS?",
    answer:
      "SmartPOS adalah platform pengelolaan operasional bisnis yang mengintegrasikan proses penjualan, produk, pengeluaran, tim, dan informasi bisnis dalam satu sistem.",
  },
  {
    question: "Apakah SmartPOS hanya bisa digunakan sebagai aplikasi kasir?",
    answer:
      "Tidak. Selain fitur kasir, SmartPOS memiliki modul dashboard, pengelolaan produk, riwayat penjualan, pengeluaran, anggota tim, shift, audit aktivitas, dan AI Business Assistant.",
  },
  {
    question: "Apakah SmartPOS mendukung pengelolaan anggota tim?",
    answer:
      "Ya. Sistem memiliki pembagian peran Owner, Manager, dan Cashier untuk membantu mengatur akses anggota tim.",
  },
  {
    question: "Apa fungsi AI Business Assistant?",
    answer:
      "AI Business Assistant dirancang untuk membantu pengguna memahami informasi bisnis berdasarkan data yang tersedia di sistem. Hasil analisis tetap perlu ditinjau oleh pengguna.",
  },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/* =========================================================
   THREE.JS HERO BACKGROUND
========================================================= */

function ThreeScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      1,
      0.1,
      100
    );

    camera.position.set(0, 0, 8);

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, 1.5)
    );
    renderer.setSize(
      mount.clientWidth,
      mount.clientHeight
    );
    renderer.setClearColor(0x000000, 0);

    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const geometry = new THREE.IcosahedronGeometry(1, 1);

    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x7777ff,
      roughness: 0.3,
      metalness: 0.55,
      wireframe: true,
      transparent: true,
      opacity: 0.55,
    });

    const core = new THREE.Mesh(geometry, coreMaterial);
    core.scale.setScalar(2.1);
    group.add(core);

    const innerGeometry = new THREE.IcosahedronGeometry(
      1,
      2
    );

    const innerMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b8cff,
      roughness: 0.22,
      metalness: 0.65,
      transparent: true,
      opacity: 0.11,
    });

    const inner = new THREE.Mesh(
      innerGeometry,
      innerMaterial
    );

    inner.scale.setScalar(1.65);
    group.add(inner);

    const ringGeometry = new THREE.TorusGeometry(
      2.75,
      0.008,
      8,
      140
    );

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      transparent: true,
      opacity: 0.5,
    });

    const ring = new THREE.Mesh(
      ringGeometry,
      ringMaterial
    );

    ring.rotation.x = Math.PI / 2.5;
    ring.rotation.y = 0.5;
    group.add(ring);

    const ring2 = new THREE.Mesh(
      ringGeometry,
      ringMaterial
    );

    ring2.rotation.x = -Math.PI / 2.8;
    ring2.rotation.y = -0.7;
    group.add(ring2);

    const shockGeometry = new THREE.TorusGeometry(
      2.75,
      0.02,
      8,
      140
    );

    const shockMaterial = new THREE.MeshBasicMaterial({
      color: 0xa5b4fc,
      transparent: true,
      opacity: 0,
    });

    const shock = new THREE.Mesh(
      shockGeometry,
      shockMaterial
    );

    shock.rotation.x = Math.PI / 2.5;
    shock.rotation.y = 0.5;
    group.add(shock);

    const particleCount = 420;
    const positions = new Float32Array(
      particleCount * 3
    );

    for (let i = 0; i < particleCount; i++) {
      const radius = 3.2 + Math.random() * 2.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(
        2 * Math.random() - 1
      );

      positions[i * 3] =
        radius * Math.sin(phi) * Math.cos(theta);

      positions[i * 3 + 1] =
        radius * Math.sin(phi) * Math.sin(theta);

      positions[i * 3 + 2] =
        radius * Math.cos(phi);
    }

    const particleGeometry =
      new THREE.BufferGeometry();

    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    const particleMaterial =
      new THREE.PointsMaterial({
        color: 0xaaaaff,
        size: 0.018,
        transparent: true,
        opacity: 0.65,
      });

    const particles = new THREE.Points(
      particleGeometry,
      particleMaterial
    );

    scene.add(particles);

    scene.add(
      new THREE.AmbientLight(0xffffff, 1.3)
    );

    const light = new THREE.PointLight(
      0x818cf8,
      25,
      20
    );

    light.position.set(3, 3, 5);
    scene.add(light);

    /* ---- interaction state ---- */

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const finePointer = window.matchMedia(
      "(pointer: fine)"
    ).matches;

    const interactive = finePointer && !reducedMotion;

    mount.style.pointerEvents = interactive
      ? "auto"
      : "none";

    let pointerX = 0;
    let pointerY = 0;
    let smoothX = 0;
    let smoothY = 0;
    let dragging = false;
    let dragDistance = 0;
    let lastX = 0;
    let lastY = 0;
    let manualX = 0;
    let manualY = 0;
    let velX = 0;
    let velY = 0;
    let pulse = 0;
    let scrollOffset = 0;

    const triggerPulse = () => {
      pulse = 1;
    };

    const events = new AbortController();
    const { signal } = events;

    window.addEventListener(
      "mousemove",
      (event) => {
        pointerX =
          (event.clientX / window.innerWidth) * 2 - 1;
        pointerY =
          (event.clientY / window.innerHeight) * 2 - 1;
      },
      { signal, passive: true }
    );

    window.addEventListener(
      "scroll",
      () => {
        scrollOffset = window.scrollY;
      },
      { signal, passive: true }
    );

    const hero = mount.closest("section");

    window.addEventListener(
      "click",
      (event) => {
        if (!hero) return;

        const rect = hero.getBoundingClientRect();

        if (
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        ) {
          triggerPulse();
        }
      },
      { signal }
    );

    if (interactive) {
      const canvas = renderer.domElement;

      canvas.style.cursor = "grab";

      canvas.addEventListener(
        "pointerdown",
        (event) => {
          dragging = true;
          dragDistance = 0;
          velX = 0;
          velY = 0;
          lastX = event.clientX;
          lastY = event.clientY;
          canvas.setPointerCapture(event.pointerId);
          canvas.style.cursor = "grabbing";
        },
        { signal }
      );

      canvas.addEventListener(
        "pointermove",
        (event) => {
          if (!dragging) return;

          const dx = event.clientX - lastX;
          const dy = event.clientY - lastY;

          lastX = event.clientX;
          lastY = event.clientY;
          dragDistance += Math.abs(dx) + Math.abs(dy);

          manualY += dx * 0.005;
          manualX += dy * 0.005;
          velY = dx * 0.005;
          velX = dy * 0.005;
        },
        { signal }
      );

      const stopDrag = () => {
        if (dragging && dragDistance < 6) {
          triggerPulse();
        }

        dragging = false;
        canvas.style.cursor = "grab";
      };

      canvas.addEventListener("pointerup", stopDrag, {
        signal,
      });

      canvas.addEventListener(
        "pointercancel",
        stopDrag,
        { signal }
      );
    }

    const clock = new THREE.Clock();
    let animationFrame = 0;

    const animate = () => {
      animationFrame = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();

      smoothX += (pointerX - smoothX) * 0.05;
      smoothY += (pointerY - smoothY) * 0.05;

      if (!dragging) {
        manualX += velX;
        manualY += velY;
        velX *= 0.94;
        velY *= 0.94;
      }

      pulse *= 0.93;

      const wave = 1 - pulse;

      group.rotation.y =
        elapsed * 0.12 +
        manualY +
        smoothX * 0.3;

      group.rotation.x =
        Math.sin(elapsed * 0.18) * 0.12 +
        manualX -
        smoothY * 0.22;

      group.position.y =
        Math.sin(elapsed * 0.5) * 0.08 -
        scrollOffset * 0.0012;

      core.rotation.y = elapsed * 0.08;
      inner.rotation.y = -elapsed * 0.1;

      ring.rotation.z =
        elapsed * (0.08 + pulse * 0.7);
      ring2.rotation.z =
        -elapsed * (0.06 + pulse * 0.6);

      ring.scale.setScalar(1 + pulse * 0.25);
      ring2.scale.setScalar(1 + pulse * 0.35);
      ringMaterial.opacity = 0.5 + pulse * 0.35;

      coreMaterial.opacity = 0.55 + pulse * 0.3;
      innerMaterial.opacity = 0.11 + pulse * 0.22;

      shock.scale.setScalar(1 + wave * 1.4);
      shockMaterial.opacity = pulse * 0.65;

      light.position.set(
        3 + smoothX * 4.5,
        3 - smoothY * 3.5,
        5
      );

      light.intensity = 25 + pulse * 45;

      particles.rotation.y =
        elapsed * 0.025 + smoothX * 0.18;
      particles.rotation.x = smoothY * 0.12;
      particleMaterial.size = 0.018 + pulse * 0.02;

      camera.position.z = 8 - pulse * 0.5;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    if (reducedMotion) {
      renderer.render(scene, camera);
    } else {
      animate();
    }

    const resizeObserver = new ResizeObserver(() => {
      if (!mount) return;

      const width = mount.clientWidth;
      const height = mount.clientHeight;

      if (!width || !height) return;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);

      if (reducedMotion) renderer.render(scene, camera);
    });

    resizeObserver.observe(mount);

    return () => {
      cancelAnimationFrame(animationFrame);
      events.abort();
      resizeObserver.disconnect();

      geometry.dispose();
      coreMaterial.dispose();
      innerGeometry.dispose();
      innerMaterial.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      shockGeometry.dispose();
      shockMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();

      renderer.dispose();

      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0"
      aria-hidden="true"
    />
  );
}

/* =========================================================
   REVEAL ANIMATION
========================================================= */

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.classList.add("is-visible");
          observer.unobserve(element);
        }
      },
      { threshold: 0.12 }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("reveal", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function SectionLabel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">
      <span className="h-px w-7 bg-indigo-400" />
      {children}
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof BarChart3;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          {label}
        </span>
        <Icon size={15} className="text-indigo-300" />
      </div>

      <div className="text-xl font-bold text-white">
        {value}
      </div>
    </div>
  );
}

/* =========================================================
   INTERACTIVE PRODUCT PREVIEW
========================================================= */

function ProductPreview() {
  const [activeTab, setActiveTab] =
    useState<PreviewTab>("overview");

  return (
    <div className="relative mx-auto w-full max-w-5xl">
      <div className="absolute -inset-5 rounded-[2rem] bg-indigo-500/10 blur-3xl" />

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#10111b] shadow-[0_30px_100px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#151621] px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
            </div>

            <span className="ml-3 text-xs font-medium text-slate-400">
              SmartPOS Workspace
            </span>
          </div>

          <span className="rounded-md border border-green-400/20 bg-green-400/10 px-2 py-1 text-[10px] text-green-300">
            PRODUCT PREVIEW
          </span>
        </div>

        <div className="flex min-h-[430px]">
          <aside className="hidden w-48 shrink-0 border-r border-white/[0.07] bg-[#12131e] p-4 md:block">
            <div className="mb-8 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500">
                <Command size={15} />
              </div>
              <span className="text-sm font-bold text-white">
                SmartPOS
              </span>
            </div>

            <p className="mb-3 text-[9px] font-bold uppercase tracking-widest text-slate-500">
              Workspace
            </p>

            {[
              "Dashboard",
              "POS / Cashier",
              "Products",
              "Sales",
              "Expenses",
              "AI Assistant",
            ].map((item, index) => (
              <div
                key={item}
                className={cn(
                  "mb-1 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px]",
                  index === 0
                    ? "bg-indigo-500/15 text-indigo-300"
                    : "text-slate-500"
                )}
              >
                {[
                  LayoutDashboard,
                  CreditCard,
                  Package,
                  Receipt,
                  Wallet,
                  BrainCircuit,
                ][index] &&
                  (() => {
                    const Icon = [
                      LayoutDashboard,
                      CreditCard,
                      Package,
                      Receipt,
                      Wallet,
                      BrainCircuit,
                    ][index];

                    return <Icon size={13} />;
                  })()}
                {item}
              </div>
            ))}
          </aside>

          <div className="min-w-0 flex-1 p-4 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] text-slate-500">
                  Workspace / Overview
                </p>
                <h3 className="mt-1 text-lg font-bold text-white">
                  Business Overview
                </h3>
              </div>

              <span className="rounded-lg border border-white/10 px-3 py-2 text-[10px] text-slate-400">
                Demo Interface
              </span>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {PREVIEW_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-[10px] font-semibold transition-all duration-300",
                    activeTab === tab.id
                      ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                      : "border border-white/10 text-slate-400 hover:border-indigo-400/50 hover:text-white"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div
              key={activeTab}
              className="animate-preview"
            >
              {activeTab === "overview" && (
                <OverviewPreview />
              )}

              {activeTab === "pos" && <POSPreview />}

              {activeTab === "products" && (
                <ProductsPreview />
              )}

              {activeTab === "assistant" && (
                <AssistantPreview />
              )}
            </div>

            <p className="mt-5 text-center text-[10px] text-slate-600">
              Ilustrasi antarmuka untuk pengenalan produk. Bukan data
              transaksi langsung.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewPreview() {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <MiniStat
          label="Total Sales"
          value="Rp 8,4 jt"
          icon={CircleDollarSign}
        />
        <MiniStat
          label="Transactions"
          value="128"
          icon={Receipt}
        />
        <MiniStat
          label="Products"
          value="56"
          icon={Package}
        />
        <MiniStat
          label="Expenses"
          value="Rp 1,2 jt"
          icon={Wallet}
        />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
          <div className="mb-5 flex justify-between">
            <span className="text-xs font-semibold text-white">
              Sales Overview
            </span>
            <span className="text-[10px] text-slate-500">
              Sample data
            </span>
          </div>

          <div className="flex h-28 items-end gap-2">
            {[35, 52, 42, 70, 54, 86, 64, 92, 72, 100, 78, 88].map(
              (height, index) => (
                <div
                  key={index}
                  className="group relative flex-1 rounded-t-sm bg-gradient-to-t from-indigo-700 to-indigo-400 transition-all duration-500 hover:from-violet-500 hover:to-cyan-300"
                  style={{ height: `${height}%` }}
                />
              )
            )}
          </div>

          <div className="mt-3 flex justify-between text-[9px] text-slate-600">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
          <span className="text-xs font-semibold text-white">
            Recent Activity
          </span>

          {[
            ["New transaction", "Today, 10:42"],
            ["Product updated", "Today, 09:20"],
            ["Expense recorded", "Yesterday"],
          ].map(([title, time]) => (
            <div
              key={title}
              className="mt-4 flex items-start gap-2"
            >
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400" />
              <div>
                <p className="text-[10px] text-slate-300">
                  {title}
                </p>
                <p className="mt-1 text-[9px] text-slate-600">
                  {time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function POSPreview() {
  const products = [
    ["Coffee Blend", "Rp 25.000"],
    ["Mineral Water", "Rp 5.000"],
    ["Chocolate Cake", "Rp 18.000"],
  ];

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_0.8fr]">
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-bold text-white">
            Select Products
          </span>
          <span className="text-[10px] text-slate-500">
            Product catalog
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {products.map(([name, price]) => (
            <div
              key={name}
              className="rounded-lg border border-white/10 p-3 transition-all hover:border-indigo-400/50"
            >
              <div className="mb-3 flex h-12 items-center justify-center rounded-lg bg-indigo-500/10">
                <Package
                  size={20}
                  className="text-indigo-300"
                />
              </div>
              <p className="text-[10px] font-semibold text-white">
                {name}
              </p>
              <p className="mt-1 text-[10px] text-indigo-300">
                {price}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-bold text-white">
            Current Order
          </span>
          <Receipt size={14} className="text-indigo-300" />
        </div>

        {products.slice(0, 2).map(([name, price]) => (
          <div
            key={name}
            className="mb-3 flex justify-between gap-2 border-b border-white/[0.07] pb-3"
          >
            <span className="text-[10px] text-slate-300">
              {name}
            </span>
            <span className="text-[10px] text-white">
              {price}
            </span>
          </div>
        ))}

        <div className="mt-5 flex justify-between">
          <span className="text-xs text-slate-400">
            Total
          </span>
          <span className="text-sm font-bold text-white">
            Rp 30.000
          </span>
        </div>

        <div className="mt-4 rounded-lg bg-indigo-500 px-3 py-2.5 text-center text-[10px] font-bold text-white">
          Checkout Preview
        </div>
      </div>
    </div>
  );
}

function ProductsPreview() {
  const items = [
    ["Coffee Blend", "SKU-001", "Rp 25.000", "24"],
    ["Mineral Water", "SKU-002", "Rp 5.000", "60"],
    ["Chocolate Cake", "SKU-003", "Rp 18.000", "12"],
    ["Green Tea", "SKU-004", "Rp 15.000", "32"],
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.025]">
      <div className="flex items-center justify-between border-b border-white/[0.08] p-4">
        <span className="text-xs font-bold text-white">
          Product Inventory
        </span>
        <span className="rounded-md bg-indigo-500/10 px-2 py-1 text-[9px] text-indigo-300">
          56 Products
        </span>
      </div>

      {items.map(([name, sku, price, stock]) => (
        <div
          key={sku}
          className="grid grid-cols-[1.3fr_1fr_1fr] items-center gap-2 border-b border-white/[0.05] px-4 py-3 last:border-0"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
              <Boxes size={14} className="text-indigo-300" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-white">
                {name}
              </p>
              <p className="text-[9px] text-slate-600">
                {sku}
              </p>
            </div>
          </div>

          <span className="text-[10px] text-slate-300">
            {price}
          </span>

          <span className="text-right text-[10px] text-slate-400">
            Stock: {stock}
          </span>
        </div>
      ))}
    </div>
  );
}

function AssistantPreview() {
  return (
    <div className="rounded-xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/[0.10] to-violet-500/[0.04] p-5">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20">
          <BrainCircuit
            size={21}
            className="text-indigo-300"
          />
        </div>
        <div>
          <p className="text-sm font-bold text-white">
            AI Business Assistant
          </p>
          <p className="text-[10px] text-slate-400">
            Business information assistant
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
        <p className="text-[10px] text-indigo-300">
          Example question
        </p>
        <p className="mt-2 text-xs text-slate-200">
          &quot;Bagaimana kondisi penjualan bisnis saya?&quot;
        </p>

        <div className="my-4 h-px bg-white/10" />

        <div className="flex gap-2">
          <Sparkles
            size={15}
            className="mt-0.5 shrink-0 text-indigo-300"
          />
          <p className="text-[11px] leading-6 text-slate-300">
            Assistant dapat membantu menjelaskan ringkasan
            informasi penjualan dan aktivitas bisnis berdasarkan
            data yang tersedia di sistem.
          </p>
        </div>
      </div>

      <p className="mt-3 text-[9px] text-slate-500">
        Contoh percakapan ilustratif, bukan hasil analisis data live.
      </p>
    </div>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [openFAQ, setOpenFAQ] = useState<number | null>(0);

  const [openFeature, setOpenFeature] = useState<
    string | null
  >(null);

  const [currentYear, setCurrentYear] = useState<
    number | null
  >(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      setCurrentYear(new Date().getFullYear())
    );

    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      document.documentElement.style.setProperty(
        "--scroll-progress",
        `${window.scrollY}px`
      );
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () =>
      window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-[#090a12] text-white selection:bg-indigo-500/30">
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
          scroll-padding-top: 90px;
        }

        body {
          background: #090a12;
        }

        .reveal {
          opacity: 0;
          transform: translateY(28px);
          transition:
            opacity 700ms ease,
            transform 700ms cubic-bezier(0.2, 0.7, 0.2, 1);
        }

        .reveal.is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .animate-preview {
          animation: previewIn 350ms ease both;
        }

        @keyframes previewIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-12px);
          }
        }

        @keyframes pulseGlow {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.75;
            transform: scale(1.08);
          }
        }

        .float-animation {
          animation: float 6s ease-in-out infinite;
        }

        .glow-animation {
          animation: pulseGlow 5s ease-in-out infinite;
        }

        .glass {
          background: rgba(255,255,255,0.035);
          backdrop-filter: blur(18px);
          border: 1px solid rgba(255,255,255,0.09);
        }

        ::selection {
          background: rgba(99,102,241,.4);
          color: white;
        }

        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }

          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }

          .reveal {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>

      {/* NAVBAR */}

      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.06] bg-[#090a12]/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-600 shadow-lg shadow-indigo-500/20">
              <Command size={19} />
            </div>

            <div>
              <span className="text-lg font-extrabold tracking-tight">
                Smart<span className="text-indigo-400">POS</span>
              </span>
              <p className="text-[9px] tracking-[0.18em] text-slate-500">
                BUSINESS MANAGEMENT
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-slate-400 transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:text-white"
            >
              Masuk
            </Link>

            <Link
              href="/auth/register"
              className="group flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-black transition-all hover:bg-indigo-100"
            >
              Mulai Sekarang
              <ArrowUpRight
                size={15}
                className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </Link>
          </div>

          <button
            onClick={() =>
              setMobileMenuOpen(!mobileMenuOpen)
            }
            className="rounded-lg border border-white/10 p-2 md:hidden"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? (
              <X size={20} />
            ) : (
              <Menu size={20} />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-white/10 bg-[#10111b] px-5 py-5 md:hidden">
            <div className="flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm text-slate-300"
                >
                  {link.label}
                </a>
              ))}

              <Link
                href="/auth/login"
                className="text-sm text-slate-300"
              >
                Masuk
              </Link>

              <Link
                href="/auth/register"
                className="rounded-lg bg-indigo-500 px-4 py-3 text-center text-sm font-bold"
              >
                Mulai Sekarang
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}

      <section
        id="home"
        className="relative flex min-h-[850px] items-center overflow-hidden pb-20 pt-36"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(79,70,229,0.18),transparent_55%)]" />

        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:65px_65px] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" />

        <div className="pointer-events-none absolute right-0 top-0 h-[700px] w-[700px] opacity-50">
          <ThreeScene />
        </div>

        <div className="pointer-events-none relative z-10 mx-auto grid w-full max-w-7xl items-center gap-14 px-5 lg:grid-cols-[1fr_0.85fr] lg:px-8">
          <div className="pointer-events-auto">
            <Reveal>
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/[0.08] px-4 py-2 text-xs font-medium text-indigo-200">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_10px_#818cf8]" />
                A smarter way to manage business
                <ArrowUpRight size={13} />
              </div>
            </Reveal>

            <Reveal delay={100}>
              <h1 className="max-w-3xl text-5xl font-black leading-[1.08] tracking-[-0.055em] sm:text-6xl lg:text-[76px]">
                Run your
                <br />
                business with
                <br />
                <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
                  more clarity.
                </span>
              </h1>
            </Reveal>

            <Reveal delay={200}>
              <p className="mt-7 max-w-xl text-base leading-8 text-slate-400 sm:text-lg">
                Dari transaksi hingga pengelolaan operasional,
                SmartPOS membantu menyatukan aktivitas bisnis
                dalam satu platform yang lebih terstruktur.
              </p>
            </Reveal>

            <Reveal delay={300}>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link
                  href="/auth/register"
                  className="group flex items-center gap-3 rounded-xl bg-indigo-500 px-6 py-4 text-sm font-bold text-white shadow-xl shadow-indigo-500/20 transition-all duration-300 hover:-translate-y-1 hover:bg-indigo-400 hover:shadow-indigo-500/40"
                >
                  Mulai Kelola Bisnis
                  <ArrowRight
                    size={17}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>

                <a
                  href="#product-preview"
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-6 py-4 text-sm font-semibold text-slate-300 transition-all hover:border-white/25 hover:bg-white/[0.07] hover:text-white"
                >
                  Explore Platform
                  <ArrowUpRight size={16} />
                </a>
              </div>
            </Reveal>

            <Reveal delay={400}>
              <div className="mt-12 flex flex-wrap gap-x-7 gap-y-3 text-xs text-slate-500">
                {[
                  "Integrated Operations",
                  "Team Management",
                  "AI-assisted Insights",
                ].map((item) => (
                  <span
                    key={item}
                    className="flex items-center gap-2"
                  >
                    <Check
                      size={13}
                      className="text-indigo-400"
                    />
                    {item}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal
            delay={250}
            className="pointer-events-auto relative hidden lg:block"
          >
            <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur-[90px]" />

            <div className="relative float-animation">
              <div className="glass relative rounded-3xl p-5 shadow-2xl shadow-indigo-950/50">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">
                      SmartPOS Workspace
                    </p>
                    <p className="mt-1 text-lg font-bold">
                      Business Overview
                    </p>
                  </div>

                  <div className="rounded-lg bg-indigo-500/15 p-2 text-indigo-300">
                    <LayoutDashboard size={20} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Sales", "Rp 8.4 jt", CircleDollarSign],
                    ["Transactions", "128", Receipt],
                    ["Products", "56", Package],
                    ["Expenses", "Rp 1.2 jt", Wallet],
                  ].map(([label, value, Icon]) => {
                    const ItemIcon =
                      Icon as typeof BarChart3;

                    return (
                      <div
                        key={label as string}
                        className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-4"
                      >
                        <ItemIcon
                          size={17}
                          className="mb-3 text-indigo-300"
                        />
                        <p className="text-[10px] text-slate-500">
                          {label as string}
                        </p>
                        <p className="mt-1 text-lg font-bold">
                          {value as string}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.035] p-4">
                  <div className="mb-5 flex items-center justify-between">
                    <span className="text-xs font-semibold">
                      Business Activity
                    </span>
                    <span className="text-[10px] text-indigo-300">
                      Preview
                    </span>
                  </div>

                  <div className="flex h-28 items-end gap-2">
                    {[35, 55, 42, 72, 58, 85, 65, 95, 70, 90].map(
                      (height, index) => (
                        <div
                          key={index}
                          className="flex-1 rounded-t-sm bg-gradient-to-t from-indigo-700 to-indigo-400 opacity-80 transition-all duration-500 hover:opacity-100"
                          style={{ height: `${height}%` }}
                        />
                      )
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Integrated business workspace</span>
                  <span className="flex items-center gap-1 text-green-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    Preview
                  </span>
                </div>
              </div>

              <div className="glass absolute -right-9 top-20 rounded-xl p-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-violet-500/20 p-2 text-violet-300">
                    <BrainCircuit size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">
                      AI Assistant
                    </p>
                    <p className="text-xs font-bold">
                      Business Insights
                    </p>
                  </div>
                </div>
              </div>

              <div className="glass absolute -bottom-7 -left-9 rounded-xl p-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-500/15 p-2 text-green-300">
                    <Zap size={17} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">
                      Operations
                    </p>
                    <p className="text-xs font-bold">
                      One connected system
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="pointer-events-none absolute bottom-24 right-8 z-10 hidden items-center gap-2 rounded-full border border-white/10 bg-[#0d0e18]/80 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 backdrop-blur-sm lg:flex">
          <Sparkles size={12} className="text-indigo-400" />
          Interaktif — seret untuk memutar, klik untuk energi
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />
      </section>

      {/* VALUE STRIP */}

      <section className="relative border-b border-white/[0.06] bg-white/[0.015] py-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-12 gap-y-5 px-5 text-xs font-semibold text-slate-500 lg:justify-between lg:px-8">
          <span className="tracking-[0.18em]">
            BUSINESS OPERATIONS
          </span>
          <span className="hidden h-5 w-px bg-white/10 sm:block" />
          <span className="flex items-center gap-2">
            <CreditCard size={15} className="text-indigo-400" />
            Sales & POS
          </span>
          <span className="flex items-center gap-2">
            <Boxes size={15} className="text-indigo-400" />
            Inventory
          </span>
          <span className="flex items-center gap-2">
            <Users size={15} className="text-indigo-400" />
            Team
          </span>
          <span className="flex items-center gap-2">
            <BrainCircuit size={15} className="text-indigo-400" />
            AI Assistant
          </span>
        </div>
      </section>

      {/* PRODUCT PREVIEW */}

      <section
        id="product-preview"
        className="relative py-28 sm:py-36"
      >
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/[0.06] blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
          <Reveal className="mx-auto mb-14 max-w-2xl text-center">
            <SectionLabel>Product Experience</SectionLabel>

            <h2 className="text-4xl font-black tracking-tight sm:text-5xl">
              See your business
              <br />
              <span className="text-indigo-300">
                from one place.
              </span>
            </h2>

            <p className="mt-5 text-sm leading-7 text-slate-400 sm:text-base">
              Satu workspace untuk melihat aktivitas bisnis,
              mengelola transaksi, mengatur produk, dan memahami
              informasi operasional.
            </p>
          </Reveal>

          <Reveal delay={150}>
            <ProductPreview />
          </Reveal>
        </div>
      </section>

      {/* FEATURES */}

      <section
        id="features"
        className="relative border-y border-white/[0.06] bg-[#0d0e18] py-28 sm:py-36"
      >
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <Reveal className="mb-16 flex flex-col justify-between gap-7 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <SectionLabel>Platform Capabilities</SectionLabel>

              <h2 className="text-4xl font-black tracking-tight sm:text-5xl">
                Everything your
                <br />
                business needs.
              </h2>
            </div>

            <p className="max-w-md text-sm leading-7 text-slate-400">
              SmartPOS menghubungkan berbagai aktivitas operasional
              dalam modul-modul yang saling mendukung.
            </p>
          </Reveal>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              const isFeatureOpen =
                openFeature === feature.number;

              return (
                <Reveal
                  key={feature.number}
                  delay={(index % 3) * 80}
                >
                  <div
                    className={cn(
                      "group relative flex h-full min-h-[230px] flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 transition-all duration-500 hover:-translate-y-1.5 hover:border-indigo-400/30 hover:bg-indigo-500/[0.055]",
                      isFeatureOpen &&
                        "border-indigo-400/30 bg-indigo-500/[0.055]"
                    )}
                  >
                    <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-indigo-500/0 blur-3xl transition-all duration-500 group-hover:bg-indigo-500/20" />

                    <button
                      type="button"
                      onClick={() =>
                        setOpenFeature(
                          isFeatureOpen
                            ? null
                            : feature.number
                        )
                      }
                      aria-expanded={isFeatureOpen}
                      aria-label={`${
                        isFeatureOpen
                          ? "Sembunyikan detail"
                          : "Lihat detail"
                      } ${feature.title}`}
                      className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    />

                    <div className="pointer-events-none relative mb-8 flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-500/10 text-indigo-300 transition-all duration-300 group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white">
                        <Icon size={20} />
                      </div>

                      <span className="font-mono text-xs text-slate-700">
                        {feature.number}
                      </span>
                    </div>

                    <div className="pointer-events-none relative mt-auto">
                      <h3 className="text-lg font-bold text-white transition-colors group-hover:text-indigo-200">
                        {feature.title}
                      </h3>

                      <p className="mt-3 text-xs leading-6 text-slate-500">
                        {feature.description}
                      </p>

                      <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-indigo-300 transition-all duration-300 group-hover:translate-x-1">
                        Lihat detail
                        <ChevronDown
                          size={14}
                          className={cn(
                            "transition-transform duration-300",
                            isFeatureOpen && "rotate-180"
                          )}
                        />
                      </div>

                      <div
                        className={cn(
                          "grid transition-all duration-300",
                          isFeatureOpen
                            ? "grid-rows-[1fr] opacity-100"
                            : "grid-rows-[0fr] opacity-0"
                        )}
                      >
                        <div className="overflow-hidden">
                          <ul className="mt-4 space-y-2.5 border-t border-white/[0.07] pt-4">
                            {feature.details.map(
                              (detail) => (
                                <li
                                  key={detail}
                                  className="flex items-start gap-2 text-[11px] leading-5 text-slate-400"
                                >
                                  <Check
                                    size={12}
                                    className="mt-0.5 shrink-0 text-indigo-400"
                                  />
                                  {detail}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* WORKFLOW */}

      <section
        id="workflow"
        className="relative py-28 sm:py-36"
      >
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <Reveal className="mx-auto mb-16 max-w-2xl text-center">
            <SectionLabel>How It Works</SectionLabel>

            <h2 className="text-4xl font-black tracking-tight sm:text-5xl">
              A clearer way to
              <br />
              manage operations.
            </h2>

            <p className="mt-5 text-sm leading-7 text-slate-400">
              Aktivitas operasional dapat dikelola melalui alur
              yang saling terhubung.
            </p>
          </Reveal>

          <div className="relative grid gap-5 md:grid-cols-3">
            <div className="absolute left-[16%] right-[16%] top-12 hidden h-px bg-gradient-to-r from-indigo-500/0 via-indigo-400/50 to-indigo-500/0 md:block" />

            {[
              {
                number: "01",
                title: "Manage",
                description:
                  "Masukkan produk, kelola stok, atur anggota tim, dan siapkan operasional bisnis.",
                icon: Boxes,
              },
              {
                number: "02",
                title: "Operate",
                description:
                  "Jalankan transaksi, catat pengeluaran, dan kelola aktivitas shift kasir.",
                icon: CreditCard,
              },
              {
                number: "03",
                title: "Understand",
                description:
                  "Pantau ringkasan aktivitas dan gunakan Assistant untuk membantu memahami data.",
                icon: BrainCircuit,
              },
            ].map((step, index) => {
              const Icon = step.icon;

              return (
                <Reveal key={step.number} delay={index * 100}>
                  <div className="relative h-full rounded-2xl border border-white/[0.07] bg-white/[0.025] p-7 transition-all duration-300 hover:border-indigo-400/30 hover:bg-white/[0.045]">
                    <div className="relative z-10 mb-8 flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-400/30 bg-[#121426] text-indigo-300 shadow-lg shadow-indigo-500/10">
                      <Icon size={21} />
                    </div>

                    <p className="font-mono text-xs text-indigo-400">
                      STEP {step.number}
                    </p>

                    <h3 className="mt-3 text-2xl font-bold">
                      {step.title}
                    </h3>

                    <p className="mt-4 text-sm leading-7 text-slate-400">
                      {step.description}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* AI SECTION */}

      <section className="relative overflow-hidden border-y border-white/[0.06] bg-[#0d0e18] py-28 sm:py-36">
        <div className="absolute -right-20 top-1/2 h-[450px] w-[450px] -translate-y-1/2 rounded-full bg-indigo-600/[0.10] blur-[120px]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 lg:grid-cols-2 lg:px-8">
          <Reveal>
            <SectionLabel>AI Business Assistant</SectionLabel>

            <h2 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl">
              Data is useful.
              <br />
              <span className="text-indigo-300">
                Understanding is power.
              </span>
            </h2>

            <p className="mt-6 max-w-lg text-sm leading-8 text-slate-400 sm:text-base">
              Data bisnis bukan hanya untuk disimpan. SmartPOS
              menghadirkan AI Business Assistant untuk membantu
              pengguna memahami informasi dan konteks aktivitas
              bisnis berdasarkan data yang tersedia.
            </p>

            <div className="mt-8 space-y-4">
              {[
                "Memahami ringkasan informasi bisnis",
                "Membantu menjelaskan data operasional",
                "Memberikan konteks berdasarkan data yang tersedia",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 text-sm text-slate-300"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-300">
                  <Check size={13} />
                </span>
                  {item}
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="relative">
              <div className="absolute -inset-5 rounded-3xl bg-indigo-500/10 blur-2xl" />

              <div className="glass relative rounded-2xl p-6 sm:p-8">
                <div className="mb-7 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
                    <BrainCircuit size={22} />
                  </div>

                  <div>
                    <p className="font-bold">
                      SmartPOS Assistant
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      Example interaction
                    </p>
                  </div>

                  <span className="ml-auto rounded-full border border-green-400/20 bg-green-400/10 px-3 py-1 text-[9px] text-green-300">
                    Preview
                  </span>
                </div>

                <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-indigo-500/20 p-4">
                  <p className="text-xs leading-6 text-slate-200">
                    Tolong jelaskan ringkasan pengeluaran bisnis
                    saya.
                  </p>
                </div>

                <div className="mt-5 flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
                    <Sparkles size={16} />
                  </div>

                  <div className="rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs leading-7 text-slate-300">
                      Saya dapat membantu menjelaskan data
                      pengeluaran yang tercatat, termasuk
                      kategorinya dan kontribusinya terhadap
                      keseluruhan pengeluaran.
                    </p>
                    <p className="mt-3 text-[9px] text-slate-600">
                      Ilustrasi jawaban. Analisis aktual bergantung
                      pada data yang tersedia.
                    </p>
                  </div>
                </div>

                <div className="mt-7 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  <span className="flex-1 text-xs text-slate-600">
                    Ask about your business...
                  </span>
                  <div className="rounded-lg bg-indigo-500 p-2 text-white">
                    <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ABOUT */}

      <section
        id="about"
        className="relative py-28 sm:py-36"
      >
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <Reveal>
              <SectionLabel>Why SmartPOS</SectionLabel>

              <h2 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl">
                Less fragmented.
                <br />
                <span className="text-indigo-300">
                  More connected.
                </span>
              </h2>
            </Reveal>

            <Reveal delay={150}>
              <p className="text-base leading-8 text-slate-400">
                Aktivitas bisnis sering tersebar di berbagai
                catatan dan proses yang berbeda. SmartPOS
                dikembangkan untuk menghadirkan pengalaman
                pengelolaan yang lebih terintegrasi, sehingga
                pengguna dapat mengakses informasi operasional
                melalui satu platform.
              </p>
            </Reveal>
          </div>

          <div className="mt-16 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: LayoutDashboard,
                title: "One Workspace",
                description:
                  "Berbagai modul operasional tersedia dalam satu platform.",
              },
              {
                icon: ShieldCheck,
                title: "Structured Access",
                description:
                  "Pengelolaan anggota tim dengan pembagian peran.",
              },
              {
                icon: BrainCircuit,
                title: "AI-assisted",
                description:
                  "Bantuan memahami informasi bisnis melalui AI Assistant.",
              },
            ].map((item, index) => {
              const Icon = item.icon;

              return (
                <Reveal key={item.title} delay={index * 100}>
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-7">
                    <Icon
                      size={23}
                      className="mb-6 text-indigo-300"
                    />
                    <h3 className="text-lg font-bold">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-slate-500">
                      {item.description}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}

      <section
        id="faq"
        className="border-y border-white/[0.06] bg-[#0d0e18] py-28"
      >
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[0.7fr_1.3fr] lg:px-8">
          <Reveal>
            <SectionLabel>FAQ</SectionLabel>

            <h2 className="text-4xl font-black tracking-tight">
              Frequently
              <br />
              asked questions.
            </h2>

            <p className="mt-5 text-sm leading-7 text-slate-400">
              Beberapa hal yang perlu diketahui sebelum mulai
              menggunakan SmartPOS.
            </p>
          </Reveal>

          <Reveal delay={100}>
            <div className="space-y-3">
              {FAQS.map((faq, index) => (
                <div
                  key={faq.question}
                  className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.025]"
                >
                  <button
                    onClick={() =>
                      setOpenFAQ(
                        openFAQ === index ? null : index
                      )
                    }
                    className="flex w-full items-center justify-between gap-4 p-5 text-left"
                  >
                    <span className="text-sm font-semibold text-slate-200">
                      {faq.question}
                    </span>

                    <ChevronDown
                      size={17}
                      className={cn(
                        "shrink-0 text-indigo-300 transition-transform duration-300",
                        openFAQ === index && "rotate-180"
                      )}
                    />
                  </button>

                  <div
                    className={cn(
                      "grid transition-all duration-300",
                      openFAQ === index
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 text-sm leading-7 text-slate-400">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}

      <section className="relative overflow-hidden py-28 sm:py-36">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(79,70,229,0.23),transparent_65%)]" />

        <div className="relative mx-auto max-w-4xl px-5 text-center">
          <Reveal>
            <div className="mx-auto mb-7 flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-500/10 text-indigo-300 shadow-xl shadow-indigo-500/10">
              <Command size={26} />
            </div>

            <h2 className="text-4xl font-black tracking-tight sm:text-6xl">
              Ready to run your
              <br />
              <span className="text-indigo-300">
                business smarter?
              </span>
            </h2>

            <p className="mx-auto mt-6 max-w-xl text-sm leading-8 text-slate-400 sm:text-base">
              Mulai kelola aktivitas bisnis melalui satu
              platform yang dirancang untuk membantu operasional
              berjalan lebih terstruktur.
            </p>

            <div className="mt-9 flex flex-wrap justify-center gap-4">
              <Link
                href="/auth/register"
                className="group flex items-center gap-3 rounded-xl bg-white px-7 py-4 text-sm font-bold text-black transition-all duration-300 hover:-translate-y-1 hover:bg-indigo-100"
              >
                Get Started
                <ArrowRight
                  size={17}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>

              <Link
                href="/auth/login"
                className="rounded-xl border border-white/15 px-7 py-4 text-sm font-semibold text-white transition-all hover:border-indigo-400/50 hover:bg-white/[0.05]"
              >
                Sign In
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}

      <footer className="border-t border-white/[0.07] bg-[#07080e]">
        <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
          <div className="flex flex-col justify-between gap-10 md:flex-row">
            <div className="max-w-sm">
              <Link
                href="/"
                className="flex items-center gap-3"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500">
                  <Command size={19} />
                </div>

                <span className="text-lg font-extrabold">
                  Smart<span className="text-indigo-400">POS</span>
                </span>
              </Link>

              <p className="mt-5 text-xs leading-7 text-slate-500">
                A connected workspace for managing business
                operations, sales, products, and team activities.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
              <div>
                <p className="mb-4 text-xs font-bold text-white">
                  Platform
                </p>
                <div className="space-y-3 text-xs text-slate-500">
                  <a
                    href="#features"
                    className="block hover:text-white"
                  >
                    Features
                  </a>
                  <a
                    href="#product-preview"
                    className="block hover:text-white"
                  >
                    Product Preview
                  </a>
                  <a
                    href="#workflow"
                    className="block hover:text-white"
                  >
                    How It Works
                  </a>
                </div>
              </div>

              <div>
                <p className="mb-4 text-xs font-bold text-white">
                  Account
                </p>
                <div className="space-y-3 text-xs text-slate-500">
                  <Link
                    href="/auth/login"
                    className="block hover:text-white"
                  >
                    Login
                  </Link>
                  <Link
                    href="/auth/register"
                    className="block hover:text-white"
                  >
                    Register
                  </Link>
                </div>
              </div>

              <div>
                <p className="mb-4 text-xs font-bold text-white">
                  Bantuan
                </p>
                <div className="space-y-3 text-xs text-slate-500">
                  <a
                    href="#faq"
                    className="block hover:text-white"
                  >
                    FAQ
                  </a>
                  <a
                    href="#about"
                    className="block hover:text-white"
                  >
                    Tentang SmartPOS
                  </a>
                  <a
                    href="#workflow"
                    className="block hover:text-white"
                  >
                    Cara Kerja
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col justify-between gap-3 border-t border-white/[0.07] pt-7 text-[10px] text-slate-600 sm:flex-row">
            <span>
              © {currentYear} SmartPOS. All rights
              reserved.
            </span>

            <span>
              Built for better business operations.
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
