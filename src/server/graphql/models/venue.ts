import { ObjectType, ID, Field } from "type-graphql";
import { GeoPosition } from "./geo_postition";

@ObjectType()
export class Venue {
  @Field(type => ID)
  readonly id!: string;

  @Field()
  readonly name!: string;

  @Field(type => GeoPosition)
  readonly position!: GeoPosition;

  @Field()
  readonly timeZone!: string;
}
