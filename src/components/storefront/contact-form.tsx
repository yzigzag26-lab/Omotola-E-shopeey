"use client";

import { useState } from "react";
import { BUSINESS } from "@/lib/env";

export function ContactForm() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  const href = `https://wa.me/${BUSINESS.whatsappNumber}?text=${encodeURIComponent(
    `Hello Corazon Empire,\n\nMy name is ${name.trim() || "—"}.\n\n${message.trim() || "I would like to ask about a piece."}`,
  )}`;

  return (
    <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
      <div>
        <label htmlFor="contact-name" className="label">Your name</label>
        <input id="contact-name" className="field" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
      </div>
      <div>
        <label htmlFor="contact-message" className="label">Message</label>
        <textarea
          id="contact-message"
          className="field min-h-32"
          rows={4}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Tell us which piece you are interested in, your size, or your delivery location."
        />
      </div>
      <a href={href} target="_blank" rel="noopener noreferrer" className="btn btn-burgundy w-full">
        Continue in WhatsApp
      </a>
      <p className="hint">
        This opens WhatsApp with your message ready to review and send. Nothing is transmitted from this page.
      </p>
    </form>
  );
}
