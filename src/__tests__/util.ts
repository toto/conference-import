import * as util from '../data_sources/rp/utils';

describe('Utilities', () => {
  it("Should parse href from link", () => {
    const source = '<a title="foo" href="http://example.com/foo/bar?bo=aa">content</a>';
    const result = util.nameAndUrlFromHtmlLink(source);
    if (!result) { expect(false).toBe(true); return; }
    
    expect(result.url).toBe('http://example.com/foo/bar?bo=aa');
  });

  it("Should parse href from link without http", () => {
    const source = '<a title="foo" href="/foo/bar?bo=aa">content</a>';
    const result = util.nameAndUrlFromHtmlLink(source);
    if (!result) { expect(false).toBe(true); return; }
    
    expect(result.url).toBe('/foo/bar?bo=aa');
  });

  it('Should make some ids', () => {
    const source = 'Some name that has a few öå';
    const result = util.mkId(source);
    expect(result).toBe('some-name-that-has-a-few-');
  });
});