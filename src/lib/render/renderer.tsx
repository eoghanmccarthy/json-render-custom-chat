"use client";

import type { ReactNode } from "react";
import * as React from "react";
import {
  ActionProvider,
  Renderer,
  StateProvider,
  ValidationProvider,
  VisibilityProvider,
  useStateStore,
} from "@json-render/react";
import type { ComponentRenderer, Spec } from "@json-render/react";

import { Fallback, registry, handlers as createHandlers } from "./registry";

// =============================================================================
// ExplorerRenderer
// =============================================================================

interface ExplorerRendererProps {
  spec: Spec | null;
  loading?: boolean;
}

const fallback: ComponentRenderer = ({ element }) => <Fallback type={element.type} />;

function ActionProviderBridge({ children }: { children: ReactNode }) {
  const { state, set } = useStateStore();

  const actionHandlers = React.useMemo(
    () =>
      createHandlers(
        () => (path: string, value: unknown) => set(path, value),
        () => state,
      ),
    [state, set],
  );

  return <ActionProvider handlers={actionHandlers}>{children}</ActionProvider>;
}

export function ExplorerRenderer({ spec, loading }: ExplorerRendererProps): ReactNode {
  if (!spec) return null;

  return (
    <StateProvider initialState={spec?.state || {}}>
      <ValidationProvider>
        <VisibilityProvider>
          <ActionProviderBridge>
            <Renderer spec={spec} registry={registry} fallback={fallback} loading={loading} />
          </ActionProviderBridge>
        </VisibilityProvider>
      </ValidationProvider>
    </StateProvider>
  );
}
