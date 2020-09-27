// tslint:disable-next-line: no-import-side-effect
import "reflect-metadata";
import { Field, ID, ObjectType } from "type-graphql";
import { Venue } from "./venue";

@ObjectType()
export class Conference {
  @Field(type => ID)
  readonly id!: string;

  @Field()
  readonly name!: string;

  @Field()
  readonly hashtag!: string; 

  @Field(type => [Venue])
  readonly venues!: Venue[];
}
