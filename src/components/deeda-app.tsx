"use client";

import { useState } from "react";
import { ChatApp } from "@/components/chat-app";
import { DeedaEntry } from "@/components/deeda-entry";

export function DeedaApp() {
  const [entered, setEntered] = useState(false);
  return entered ? <ChatApp /> : <DeedaEntry onEnter={() => setEntered(true)} />;
}
