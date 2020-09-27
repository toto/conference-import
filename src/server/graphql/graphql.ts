// tslint:disable-next-line: no-import-side-effect
import "reflect-metadata";
import { ApolloServer } from "apollo-server";
import { Container } from "typedi";
import { buildSchema } from "type-graphql";

import { ConferenceResolver } from "./resolvers/conference_resolver";
import { sampleConferences } from "./__tests__/fixtures/sample_confereces";

// put sample conferences in container
Container.set({ id: "SAMPLE_CONFERENCES", factory: () => sampleConferences.slice() });

async function bootstrap() {
  // build TypeGraphQL executable schema
  const schema = await buildSchema({
    resolvers: [ConferenceResolver],
    // register 3rd party IOC container
    container: Container,
  });

  // Create GraphQL server
  const server = new ApolloServer({ schema });

  // Start the server
  const { url } = await server.listen(4000);
  console.log(`Server is running, GraphQL Playground available at ${url}`);
}

// tslint:disable-next-line: no-floating-promises
bootstrap();
