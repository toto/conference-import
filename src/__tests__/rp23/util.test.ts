import { htmlListAndParagraphToString } from "../../dataSources/rp2/util"

describe("util", () => {
  it("should transform paragraphs to newlines", () => {
    const source = `
<p>
This is paragraph 1
</p>
<p>
This is paragraph 2
</p>
`
    const result = htmlListAndParagraphToString(source)
    expect(result).not.toBeNull()
    
    const expectedResult = `This is paragraph 1

This is paragraph 2`

    expect(result).toEqual(expectedResult);
  })

  it("should transform list to bullets", () => {
    const source = `
<ul>
<li>This is item 1</li>
<li>This is item 2</li>
</ul>
`
    const result = htmlListAndParagraphToString(source)
    expect(result).not.toBeNull()
    
    const expectedResult = ` • This is item 1
 • This is item 2`

    expect(result).toEqual(expectedResult);
  })

  it("should transform br to newlines", () => {
    const source = `foo<br>bar<br/>baz`
    const result = htmlListAndParagraphToString(source)
    expect(result).not.toBeNull()
    
    const expectedResult = `foo\nbar\nbaz`

    expect(result).toEqual(expectedResult);
  })  
})
