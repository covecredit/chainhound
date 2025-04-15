import React, { useState, useRef } from "react";

const SearchBar = ({ autoFocus = false }) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle the search query submission
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center w-full gap-2">
      <input
        ref={inputRef}
        type="text"
        className="flex-grow w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
        placeholder="Search by block number, address, transaction hash, or ENS..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus={autoFocus}
        spellCheck={false}
        autoComplete="off"
      />
      {/* Add any additional elements here */}
    </form>
  );
};

export default SearchBar;
