import { invoke } from "@tauri-apps/api/core";
import type {
  ClientRow,
  ClientApprovalHistoryRow,
  ClientCommunicationRow,
  ClientFeedbackRow,
  CreateClientCommunicationInput,
  CreateClientFeedbackInput,
  RespondToFeedbackInput,
} from "../types";

export const invokeTauri = <T>(command: string, args?: Record<string, unknown>) =>
  invoke<T>(command, args);

// Client API functions
export const listClients = (input?: any) =>
  invokeTauri<ClientRow[]>("list_clients", input ? { input } : undefined);

export const createClient = (input: any) =>
  invokeTauri<string>("create_client", { input });

export const updateClient = (input: any) =>
  invokeTauri<void>("update_client", { input });

export const deleteClient = (id: string) =>
  invokeTauri<void>("delete_client", { id });

export const searchClients = (input: any) =>
  invokeTauri<ClientRow[]>("search_clients", { input });

export const checkClientConflict = (input: any) =>
  invokeTauri<any>("check_client_conflict", { input });

// New client handling API functions
export const listClientApprovalHistory = (clientId: string) =>
  invokeTauri<ClientApprovalHistoryRow[]>("list_client_approval_history", { client_id: clientId });

export const createClientCommunication = (input: CreateClientCommunicationInput) =>
  invokeTauri<string>("create_client_communication", { input });

export const listClientCommunications = (clientId: string) =>
  invokeTauri<ClientCommunicationRow[]>("list_client_communications", { client_id: clientId });

export const createClientFeedback = (input: CreateClientFeedbackInput) =>
  invokeTauri<string>("create_client_feedback", { input });

export const listClientFeedback = (clientId?: string) =>
  invokeTauri<ClientFeedbackRow[]>("list_client_feedback", clientId ? { client_id: clientId } : undefined);

export const respondToClientFeedback = (input: RespondToFeedbackInput) =>
  invokeTauri<void>("respond_to_client_feedback", { input });
