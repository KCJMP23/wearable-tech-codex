'use client';

import React from 'react';
import { useEditor } from '@craftjs/core';

export function Settings() {
  const { selected, actions } = useEditor((state) => {
    const [currentNodeId] = state.events.selected;
    let selected;

    if (currentNodeId) {
      selected = {
        id: currentNodeId,
        name: state.nodes[currentNodeId].data.name,
        settings: state.nodes[currentNodeId].related?.settings,
        isDeletable: state.nodes[currentNodeId].data.isDeletable !== false,
      };
    }

    return {
      selected,
    };
  });

  return (
    <div className="p-4">
      {selected ? (
        <>
          <div className="mb-4">
            <h3 className="font-bold text-lg mb-2">{selected.name}</h3>
            {selected.isDeletable && (
              <button
                onClick={() => {
                  actions.delete(selected.id);
                }}
                className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete Component
              </button>
            )}
          </div>
          
          {selected.settings && React.createElement(selected.settings)}
        </>
      ) : (
        <div className="text-gray-500 text-center">
          <p>Select a component to edit its properties</p>
        </div>
      )}
    </div>
  );
}