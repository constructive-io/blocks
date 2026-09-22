import { FilesChatCard } from './cards/files-chat-card';
import { PlanChatCard } from './cards/plan-chat-card';
import { ReasoningChatCard } from './cards/reasoning-chat-card';
import { SimpleChatCard } from './cards/simple-chat-card';
import { ToolChatCard } from './cards/tool-chat-card';
import { stagger, WallShell } from './wall-shell';

/** Wall 03 · assistant — five full-height chat columns, one per card. */
export function WallAssistant() {
  return (
    <WallShell wall="assistant" tracks="grid-cols-[repeat(5,400px)] items-stretch">
      <div className="flex min-h-[760px] flex-col" style={stagger(0)}>
        <SimpleChatCard />
      </div>
      <div className="flex min-h-[760px] flex-col" style={stagger(1)}>
        <ToolChatCard />
      </div>
      <div className="flex min-h-[760px] flex-col" style={stagger(2)}>
        <ReasoningChatCard />
      </div>
      <div className="flex min-h-[760px] flex-col" style={stagger(3)}>
        <FilesChatCard />
      </div>
      <div className="flex min-h-[760px] flex-col" style={stagger(4)}>
        <PlanChatCard />
      </div>
    </WallShell>
  );
}
