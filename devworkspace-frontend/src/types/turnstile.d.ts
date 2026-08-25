declare global {
  interface Window {
    turnstile: {
      render: (
        id: string,
        options: {
          sitekey: string;
          theme?: string;
          callback?: (token: string) => void;
        }
      ) => void;
    };
  }
}

export {};
