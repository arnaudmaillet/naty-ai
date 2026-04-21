'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { MainThread } from './threads/MainThread';
import { ForkThread } from './threads/ForkThread';
import { useForkThread } from 'apps/frontend/src/hooks/useForkThread';
import { useForkStore } from 'apps/frontend/src/store/useForkStore';
import { cn } from "../../../lib/utils";

// Hooks et Stores
import { useChatQueries } from 'apps/frontend/src/hooks/useChatQueries';

export function LayoutContent() {
    const searchParams = useSearchParams();
    const idFromUrl = searchParams.get('id');

    const isForkOpen = useForkStore(state => state.isOpen);

    const { modelsQuery } = useChatQueries(idFromUrl);
    const models = useMemo(() => modelsQuery.data || [], [modelsQuery.data]);

    return (
        <div className="flex flex-row h-full w-full overflow-hidden bg-white">
            <div className={cn("h-full transition-all duration-500 relative", isForkOpen ? "w-1/2" : "w-full")}>
                <MainThread
                    idFromUrl={idFromUrl}
                    models={models}
                    isForkOpen={isForkOpen}
                />
            </div>

            {isForkOpen && (
                <div className="w-1/2 h-full flex flex-col p-3">
                    <ForkThread models={models} />
                </div>
            )}
        </div>
    );
}