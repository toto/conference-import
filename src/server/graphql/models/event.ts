import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
export class Event {
  @Field(type => ID)
  readonly id!: string;

  @Field()
  readonly title!: string;

  @Field()
  readonly subtitle?: string;

  @Field()
  readonly abstract?: string;

  @Field()
  readonly description?: string;

  @Field()
  readonly start?: Date;

  @Field()
  readonly end?: Date;
}

