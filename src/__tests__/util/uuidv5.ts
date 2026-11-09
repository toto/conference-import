import { uuidv5 } from "../../dataSources/util";

// Expected values computed with Python: uuid.uuid5(uuid.UUID(ns), name)
const ns = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

it("Should match Python's uuid.uuid5", () => {
  expect(uuidv5(ns, "ABC7XY")).toBe("7bd9b983-2d7b-5fd8-9992-6bde037b7af9");
  expect(uuidv5(ns, "ABC7XY-1")).toBe("74b69db8-ad07-502f-be3c-ccbdbe58b7dc");
  expect(uuidv5(ns, "Grüße")).toBe("d608d6cd-4cee-54a1-8e24-8ca9de8ac858");
});

it("Should accept an uppercase namespace", () => {
  expect(uuidv5(ns.toUpperCase(), "ABC7XY")).toBe("7bd9b983-2d7b-5fd8-9992-6bde037b7af9");
});

it("Should reject an invalid namespace", () => {
  expect(() => uuidv5("not-a-uuid", "ABC7XY")).toThrow();
});
