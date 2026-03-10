"use client";

import * as Sentry from "@sentry/nextjs";

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold mb-4">Sentry Example Page</h1>
          <p className="text-gray-600 mb-8">
            Click the buttons below to test Sentry error capture
          </p>
        </div>

        <div className="space-y-4">
          {/* Test 1: Client-side error */}
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Test 1: Client Error</h2>
            <p className="text-sm text-gray-600 mb-4">
              Throws a client-side error that Sentry will capture
            </p>
            <button
              className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              onClick={() => {
                throw new Error("🧪 Sentry Test: Client-side error from example page");
              }}
            >
              Throw Client Error
            </button>
          </div>

          {/* Test 2: Captured exception */}
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Test 2: Captured Exception</h2>
            <p className="text-sm text-gray-600 mb-4">
              Manually captures an error with custom context
            </p>
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              onClick={() => {
                Sentry.captureException(new Error("🧪 Sentry Test: Manually captured error"), {
                  tags: {
                    source: "example-page",
                    test: "true",
                  },
                  extra: {
                    timestamp: new Date().toISOString(),
                    userAction: "button-click",
                  },
                });
                alert("Error captured! Check your Sentry dashboard.");
              }}
            >
              Capture Exception
            </button>
          </div>

          {/* Test 3: Message */}
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Test 3: Capture Message</h2>
            <p className="text-sm text-gray-600 mb-4">
              Sends a message to Sentry (not an error)
            </p>
            <button
              className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              onClick={() => {
                Sentry.captureMessage("🧪 Sentry Test: This is a test message", {
                  level: "info",
                  tags: {
                    source: "example-page",
                  },
                });
                alert("Message sent! Check your Sentry dashboard.");
              }}
            >
              Send Message
            </button>
          </div>

          {/* Test 4: Undefined function */}
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Test 4: Undefined Function</h2>
            <p className="text-sm text-gray-600 mb-4">
              Calls a function that doesn't exist (as per Sentry docs)
            </p>
            <button
              className="bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              onClick={() => {
                // @ts-ignore
                myUndefinedFunction();
              }}
            >
              Call Undefined Function
            </button>
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm">
            <strong>✅ After clicking a button:</strong><br />
            Check your Sentry dashboard at:{" "}
            <a
              href="https://sentry.io/organizations/skiadmin-9z/issues/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              sentry.io/organizations/skiadmin-9z/issues/
            </a>
          </p>
          <p className="text-xs text-gray-600 mt-2">
            Errors should appear within 10-30 seconds
          </p>
        </div>

        <div className="mt-4">
          <a
            href="/"
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            ← Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
