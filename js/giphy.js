const Giphy = (() => {
  // Giphy integration — requires API key
  // Without key, this module is silently disabled.
  // To enable: set GIPHY_API_KEY in config.js or localStorage('fh_giphy_key')
  const getKey = () =>
    (typeof FIXY_CONFIG !== 'undefined' && FIXY_CONFIG.giphyApiKey) ||
    localStorage.getItem('fh_giphy_key');

  return {
    isEnabled() { return !!getKey(); },

    async search(query, limit = 1) {
      const key = getKey();
      if (!key) return null;
      try {
        const url = `https://api.giphy.com/v1/gifs/search?api_key=${key}&q=${encodeURIComponent(query)}&limit=${limit}&rating=pg`;
        const res = await fetch(url);
        const json = await res.json();
        const gif = json.data?.[0];
        return gif ? gif.images.fixed_height.url : null;
      } catch { return null; }
    },

    async celebrate() {
      return this.search('success celebration');
    }
  };
})();
