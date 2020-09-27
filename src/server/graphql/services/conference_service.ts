import { Service, Inject } from "typedi";
import type { Conference } from "../models/conference";

@Service()
export class ConferenceService {
  @Inject("SAMPLE_CONFERENCES") 
  private readonly items!: Conference[]
  
  async getAll() {
    return this.items;
  }

  async getOne(id: string) {
    return this.items.find(it => it.id === id);
  }
}