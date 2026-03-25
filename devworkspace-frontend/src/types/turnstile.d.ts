declare global {
  interface Window {
    turnstile: {
      render: (id: string, options: { sitekey: string }) => void;
    };
  }
}

export {};
