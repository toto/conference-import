import { ObjectType, ID, Field } from "type-graphql";

@ObjectType()
class GeoPosition {
  @Field()
  readonly lat!: number

  @Field()
  readonly lng!: number
}

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

