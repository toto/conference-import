import * as util from '../../data_sources/rp19/utils';

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
});