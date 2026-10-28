export type Quest = { room:string; codeInput:string; name:string; route:number; routeName:string; filter:string; collected:boolean; answer:string; voice:boolean; sound:boolean; view:string; scanned:boolean; score:number; elapsed:string };
export type ScreenProps = { q:Quest; act:(action:string,value?:string)=>void };
