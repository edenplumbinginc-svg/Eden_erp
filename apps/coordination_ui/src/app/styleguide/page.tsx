"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function Styleguide() {
  const [value, setValue] = useState("");
  const swatches = [
    { name: "Primary", cls: "bg-primary text-primary-foreground" },
    { name: "Secondary", cls: "bg-secondary text-secondary-foreground" },
    { name: "Accent", cls: "bg-accent text-accent-foreground" },
    { name: "Muted", cls: "bg-muted text-muted-foreground" },
    { name: "Foreground", cls: "bg-foreground text-background" },
    { name: "Destructive", cls: "bg-destructive text-destructive-foreground" },
  ];

  const spacers = ["1", "2", "3", "4", "6", "8", "10", "12", "16"];

  return (
    <div className="min-h-screen p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Styleguide</h1>
        <Link
          href="/"
          className="text-sm underline opacity-70 hover:opacity-100"
        >
          ← Back to app
        </Link>
      </div>

      {/* Colors */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Color Tokens</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {swatches.map((s) => (
            <div
              key={s.name}
              className={`rounded-xl p-4 h-24 flex items-end ${s.cls}`}
            >
              <span className="text-xs font-medium">{s.name}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Typography */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Typography</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Display / H1</h1>
          <h2 className="text-3xl font-semibold tracking-tight">
            Headline / H2
          </h2>
          <h3 className="text-2xl font-semibold tracking-tight">Title / H3</h3>
          <p className="text-base leading-7 opacity-90">
            Body / Base — readable paragraph sizing with proper line-height.
          </p>
          <p className="text-sm opacity-70">
            Caption / Small — secondary info and labels.
          </p>
        </CardContent>
      </Card>

      {/* Spacing scale */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Spacing Scale</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {spacers.map((s) => (
            <div key={s} className="flex items-center gap-4">
              <div className="w-28 text-sm opacity-70">p-{s}</div>
              <div className="bg-muted rounded-md">
                <div
                  className={`bg-primary/70 h-6 rounded-md w-${s} md:w-${s * 2}`}
                ></div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Components */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Components</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex gap-3 flex-wrap">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="destructive">Danger</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </div>
            <div className="space-y-2">
              <label className="text-sm opacity-80">Input</label>
              <Input
                placeholder="Type something…"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="p-4 border rounded-2xl bg-card text-card-foreground"
          >
            <div className="text-sm opacity-70 mb-2">Elevation / Layout</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="h-16 rounded-xl bg-muted" />
              <div className="h-16 rounded-xl bg-muted/70" />
              <div className="h-16 rounded-xl bg-muted/50" />
            </div>
            <div className="mt-4 text-sm">
              Use generous radius (`rounded-2xl`) and soft shadows (`shadow-sm`)
              for a calmer ERP feel.
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </div>
  );
}
