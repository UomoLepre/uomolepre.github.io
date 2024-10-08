import Image from "next/image";
import React from "react";
import { Component } from "@/components/component";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";


export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-12" style={{backgroundColor: '#09101f'}}>
      <Component />
      <div className="container">
        <Alert />
      </div>
    </main>

  );
}