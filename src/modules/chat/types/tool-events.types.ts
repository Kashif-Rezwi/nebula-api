// Types for tool call events sent to frontend

export interface ToolCallStartEvent {
    type: 'tool-call-start';
    toolCallId: string;
    toolName: string;
    args: any;
    timestamp: string;
  }
  
  export interface ToolCallResultEvent {
    type: 'tool-call-result';
    toolCallId: string;
    toolName: string;
    result: any;
    success: boolean;
    duration: number;
    timestamp: string;
  }
  
  export interface ToolCallErrorEvent {
    type: 'tool-call-error';
    toolCallId: string;
    toolName: string;
    error: string;
    timestamp: string;
  }
  
  export type ToolEvent = 
    | ToolCallStartEvent 
    | ToolCallResultEvent 
    | ToolCallErrorEvent;