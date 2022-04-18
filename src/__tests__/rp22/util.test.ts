import { colorArrayFromHex } from "../../dataSources/util"

describe("util", () => {
  it("should parse hex colors correctly", () => {
    const result = colorArrayFromHex("#5DCCFF")
    expect(result).not.toBeNull()
    const [r,g,b,a] = result!;
    expect(r).toEqual(93)
    expect(g).toEqual(204)
    expect(b).toEqual(255)
    expect(a).toEqual(1)
  })
})