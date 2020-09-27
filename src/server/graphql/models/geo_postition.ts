import { ObjectType, ID, Field } from "type-graphql";

@ObjectType()
export class GeoPosition {
  @Field()
  readonly lat!: number

  @Field()
  readonly lng!: number
}