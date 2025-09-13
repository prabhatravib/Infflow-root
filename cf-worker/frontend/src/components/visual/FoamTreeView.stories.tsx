import type { Meta, StoryObj } from '@storybook/react';
import { FoamTreeView } from './FoamTreeView';
import sampleClusterData from '../../fixtures/clusters.sample.json';

const meta: Meta<typeof FoamTreeView> = {
  title: 'Components/Visual/FoamTreeView',
  component: FoamTreeView,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A React wrapper for FoamTree visualization with resize handling and event wiring.'
      }
    }
  },
  argTypes: {
    onSelect: { action: 'selected' },
    onOpen: { action: 'opened' },
    onExpose: { action: 'exposed' },
    className: {
      control: 'text',
      description: 'Additional CSS classes'
    }
  }
};

export default meta;
type Story = StoryObj<typeof FoamTreeView>;

export const Default: Story = {
  args: {
    data: sampleClusterData,
    className: 'w-full h-96'
  },
  parameters: {
    docs: {
      description: {
        story: 'Default FoamTreeView with sample machine learning cluster data.'
      }
    }
  }
};

export const WithCallbacks: Story = {
  args: {
    data: sampleClusterData,
    onSelect: (nodeIds) => console.log('Selected nodes:', nodeIds),
    onOpen: (nodeId) => console.log('Opened node:', nodeId),
    onExpose: (nodeId) => console.log('Exposed node:', nodeId),
    className: 'w-full h-96'
  },
  parameters: {
    docs: {
      description: {
        story: 'FoamTreeView with event callbacks for selection, opening, and exposing nodes.'
      }
    }
  }
};

export const CustomHeight: Story = {
  args: {
    data: sampleClusterData,
    className: 'w-full h-64'
  },
  parameters: {
    docs: {
      description: {
        story: 'FoamTreeView with custom height (16rem/256px).'
      }
    }
  }
};

export const LargeDataset: Story = {
  args: {
    data: {
      id: "root",
      label: "Large Dataset",
      weight: 20,
      children: [
        {
          id: "cluster-1",
          label: "Category A",
          weight: 15,
          items: [
            { id: "item-1", title: "Item 1", url: "https://example.com/1", score: 0.9 },
            { id: "item-2", title: "Item 2", url: "https://example.com/2", score: 0.8 }
          ],
          children: [
            {
              id: "cluster-1-1",
              label: "Sub A1",
              weight: 10,
              items: [
                { id: "item-3", title: "Item 3", url: "https://example.com/3", score: 0.7 }
              ]
            },
            {
              id: "cluster-1-2",
              label: "Sub A2",
              weight: 8,
              items: [
                { id: "item-4", title: "Item 4", url: "https://example.com/4", score: 0.6 }
              ]
            }
          ]
        },
        {
          id: "cluster-2",
          label: "Category B",
          weight: 12,
          items: [
            { id: "item-5", title: "Item 5", url: "https://example.com/5", score: 0.85 },
            { id: "item-6", title: "Item 6", url: "https://example.com/6", score: 0.75 }
          ]
        },
        {
          id: "cluster-3",
          label: "Category C",
          weight: 8,
          items: [
            { id: "item-7", title: "Item 7", url: "https://example.com/7", score: 0.65 }
          ]
        }
      ]
    },
    className: 'w-full h-96'
  },
  parameters: {
    docs: {
      description: {
        story: 'FoamTreeView with a larger, more complex dataset to test performance and layout.'
      }
    }
  }
};
