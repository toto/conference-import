import { Arg, Query, Resolver } from "type-graphql";
import { Conference } from "../models/conference";
import { ConferenceService } from "../services/conference_service";

@Resolver(of => Conference)
export class ConferenceResolver {
  constructor(
    // constructor injection of service
    private readonly conferenceService: ConferenceService) { }

  @Query(returns => Conference, { nullable: true })
  async recipe(@Arg("conferenceId") conferenceId: string) {
    return this.conferenceService.getOne(conferenceId);
  }

  @Query(returns => [Conference])
  async recipes(): Promise<Conference[]> {
    return this.conferenceService.getAll();
  }
}
