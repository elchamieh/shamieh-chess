"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const META_APP_ID = "1376208463846258";
const META_CONFIG_ID = "27910327895292349";

type FacebookLoginResponse = {
  authResponse?: {
    code?: string;
  };
  status?: string;
};

type FacebookSdk = {
  init: (options: Record<string, unknown>) => void;
  login: (
    callback: (response: FacebookLoginResponse) => void,
    options: Record<string, unknown>,
  ) => void;
};

declare global {
  interface Window {
    FB?: FacebookSdk;
    fbAsyncInit?: () => void;
  }
}

export default function WhatsAppConnectPage() {
  const [sdkReady, setSdkReady] = useState(false);
  const [status, setStatus] = useState("Ready to connect the academy WhatsApp Business account.");
  const [wabaId, setWabaId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");

  useEffect(() => {
    window.fbAsyncInit = () => {
      window.FB?.init({
        appId: META_APP_ID,
        cookie: true,
        xfbml: true,
        version: "v25.0",
      });
      setSdkReady(true);
    };

    const onMessage = (event: MessageEvent) => {
      if (!event.origin.endsWith("facebook.com")) return;

      let payload = event.data;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          return;
        }
      }

      if (!payload || payload.type !== "WA_EMBEDDED_SIGNUP") return;

      const data = payload.data || {};
      if (data.waba_id) setWabaId(String(data.waba_id));
      if (data.phone_number_id) setPhoneNumberId(String(data.phone_number_id));

      if (payload.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING" || payload.event === "FINISH") {
        setStatus("Meta onboarding completed. Keep this page open while we finish the server connection.");
      } else if (payload.event === "CANCEL") {
        setStatus("Onboarding was cancelled. You can start it again safely.");
      } else if (payload.event === "ERROR") {
        setStatus("Meta reported an onboarding error. Please keep the error window visible and send us a screenshot.");
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  function launchSignup() {
    if (!window.FB || !sdkReady) {
      setStatus("Meta is still loading. Wait a few seconds and try again.");
      return;
    }

    setStatus("Opening Meta. Choose the option to connect your existing WhatsApp Business app account.");

    window.FB.login(
      (response) => {
        if (response.authResponse?.code) {
          setStatus("Meta authorization completed. Waiting for the WhatsApp account details...");
        } else if (response.status === "unknown") {
          setStatus("Meta sign-in was closed before completion. You can try again.");
        }
      },
      {
        config_id: META_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "whatsapp_business_app_onboarding",
          sessionInfoVersion: "3",
          version: "v4",
        },
      },
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f4f1e8", color: "#17201b", padding: "48px 20px" }}>
      <Script src="https://connect.facebook.net/en_US/sdk.js" strategy="afterInteractive" onLoad={() => window.fbAsyncInit?.()} />
      <div style={{ maxWidth: 760, margin: "0 auto", background: "white", borderRadius: 20, padding: 32, boxShadow: "0 18px 60px rgba(0,0,0,.08)" }}>
        <p style={{ letterSpacing: ".12em", fontWeight: 700, fontSize: 13, margin: 0 }}>SHAMIEH CHESS ACADEMY</p>
        <h1 style={{ fontSize: 38, lineHeight: 1.08, margin: "12px 0 14px" }}>Connect Academy WhatsApp</h1>
        <p style={{ fontSize: 18, lineHeight: 1.6, marginTop: 0 }}>
          This setup connects the academy&apos;s existing WhatsApp Business app account to Meta Cloud API using Coexistence. The WhatsApp Business app stays in use on the academy phone.
        </p>

        <div style={{ background: "#f7f7f4", borderRadius: 14, padding: 18, margin: "24px 0" }}>
          <strong>Status</strong>
          <div style={{ marginTop: 6, lineHeight: 1.5 }}>{status}</div>
          {wabaId ? <div style={{ marginTop: 12 }}><strong>WABA ID:</strong> {wabaId}</div> : null}
          {phoneNumberId ? <div style={{ marginTop: 6 }}><strong>Phone Number ID:</strong> {phoneNumberId}</div> : null}
        </div>

        <button
          type="button"
          onClick={launchSignup}
          disabled={!sdkReady}
          style={{
            border: 0,
            borderRadius: 10,
            padding: "14px 20px",
            fontSize: 17,
            fontWeight: 700,
            cursor: sdkReady ? "pointer" : "wait",
            background: "#1877f2",
            color: "white",
            opacity: sdkReady ? 1 : 0.6,
          }}
        >
          {sdkReady ? "Connect existing WhatsApp Business app" : "Loading Meta..."}
        </button>

        <p style={{ marginTop: 22, color: "#56625b", lineHeight: 1.55 }}>
          Important: if Meta asks you to disconnect or deregister the existing WhatsApp account, cancel the flow. The correct Coexistence flow should let you connect the existing WhatsApp Business app instead.
        </p>
      </div>
    </main>
  );
}
