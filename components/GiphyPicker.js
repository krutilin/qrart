import React, { useCallback, useEffect, useMemo, useState } from "react";
import { GiphyFetch } from "@giphy/js-fetch-api";

const defaultQuery = "pixel";

const getGiphyImageUrls = (gif) => [
  gif.images?.fixed_width?.url,
  gif.images?.fixed_height?.url,
  gif.images?.downsized?.url,
  gif.images?.downsized_medium?.url,
  gif.images?.original?.url,
].filter(Boolean);

const GiphyPicker = ({ apiKey, texts, onGifChange }) => {
  const [query, setQuery] = useState(defaultQuery);
  const [gifs, setGifs] = useState([]);
  const [selectedUrl, setSelectedUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const giphy = useMemo(() => (apiKey ? new GiphyFetch(apiKey) : null), [apiKey]);

  const search = useCallback(async (searchQuery) => {
    const normalizedQuery = searchQuery.trim();
    if (!giphy) {
      setError(texts.giphy_missing_key);
      return;
    }
    if (!normalizedQuery) {
      setGifs([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await giphy.search(normalizedQuery, {
        limit: 12,
        rating: "g",
        sort: "relevant",
      });
      const nextGifs = result.data.map((gif) => ({
        id: gif.id,
        title: gif.title,
        previewUrl: gif.images?.fixed_width_small?.url || gif.images?.downsized?.url,
        url: gif.images?.fixed_width?.url || gif.images?.downsized?.url || gif.images?.original?.url,
        urls: getGiphyImageUrls(gif),
      })).filter((gif) => gif.previewUrl && gif.url);
      setGifs(nextGifs);
      if (nextGifs[0]) {
        setSelectedUrl(nextGifs[0].url);
        onGifChange(nextGifs[0]);
      }
    } catch (e) {
      setError(e.message);
      setGifs([]);
    } finally {
      setLoading(false);
    }
  }, [giphy, onGifChange, texts.giphy_missing_key]);

  useEffect(() => {
    search(defaultQuery);
  }, [search]);

  const selectGif = useCallback(
    (gif) => {
      setSelectedUrl(gif.url);
      onGifChange(gif);
    },
    [onGifChange]
  );

  const onSubmit = useCallback(
    (e) => {
      e.preventDefault();
      search(query);
    },
    [query, search]
  );

  useEffect(() => () => onGifChange(null), [onGifChange]);

  return (
    <div className="giphy-picker animate__animated animate__bounceInUp">
      <form className="giphy-search" onSubmit={onSubmit}>
        <input
          className="nes-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={texts.giphy_search_placeholder}
        />
        <button className="nes-btn is-primary" type="submit" disabled={loading}>
          {texts.giphy_search}
        </button>
      </form>

      {error && <p className="giphy-error">{error}</p>}

      {selectedUrl && (
        <div className="media-selected">
          <img src={selectedUrl} alt={texts.giphy_selected} />
        </div>
      )}

      <div className="media-grid">
        {gifs.map((gif) => (
          <button
            className={`media-item ${selectedUrl === gif.url ? "is-selected" : ""}`}
            key={gif.id}
            type="button"
            onClick={() => selectGif(gif)}
            aria-label={gif.title || texts.button_giphy}
          >
            <img src={gif.previewUrl} alt={gif.title || texts.button_giphy} />
          </button>
        ))}
      </div>

      {loading && (
        <div className="loader nes-badge animate__animated animate__pulse animate__infinite">
          <span className="is-warning">{texts.loading}</span>
        </div>
      )}
    </div>
  );
};

export default GiphyPicker;
