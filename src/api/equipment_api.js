import api from "./axios";

export const issueEquipment = (payload) =>
  api.post("/equipment/issue", payload);

export const returnEquipment = (payload) =>
  api.post("/equipment/return", payload);

