'use client';

import { useQueryStates } from 'nuqs';
import { Suspense } from 'react';

import { intentsListParsers } from '@/components/features/intents/intents-filters';
import { IntentsOrders } from '@/components/features/intents/intents-orders';
import { IntentsOverview } from '@/components/features/intents/intents-overview';
import { PageHeader } from '@/components/shared/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TITLE = 'NEAR Intents';
const DESCRIPTION =
  'USDC payments through NEAR Intents: deployed contracts, live guard state, orders and on-chain transactions.';

function IntentsContent() {
  const [state, setState] = useQueryStates(intentsListParsers, {
    shallow: false,
  });

  return (
    <div>
      <PageHeader title={TITLE} description={DESCRIPTION} />
      <Tabs
        value={state.tab}
        onValueChange={(tab) =>
          setState({ tab: tab === 'orders' ? 'orders' : 'overview' })
        }
      >
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="pt-2">
          <IntentsOverview />
        </TabsContent>
        <TabsContent value="orders" className="pt-2">
          <IntentsOrders />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function IntentsPage() {
  return (
    <Suspense fallback={<PageHeader title={TITLE} description={DESCRIPTION} />}>
      <IntentsContent />
    </Suspense>
  );
}
