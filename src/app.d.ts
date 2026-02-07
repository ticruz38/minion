declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
  
  interface Window {
    __TESTING__?: boolean;
  }
}

export {};
