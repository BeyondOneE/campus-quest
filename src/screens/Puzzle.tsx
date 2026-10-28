import type { ScreenProps } from "../types";
function Puzzle({ q, act }: ScreenProps) {
  return (
    <>
      <div data-type="PAGE" className="relative w-[390px] h-[1580px] bg-[#13202E]/[1] overflow-y-auto overflow-x-hidden">
  <div data-type="CONTAINER" className="w-[390px] h-[128px] absolute top-[0px] left-[0px] z-[9] bg-[#1F2D3C]/[0.95] shadow-[0px_2px_8px_0px_#13202E59] backdrop-blur-[12px] opacity-[1]">
    <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
      <div data-type="CONTAINER" className="w-[390px] h-[40px] absolute top-[0px] left-[0px] z-[10] bg-[#000000]/[0] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <img alt="" data-type="IMAGE" className="absolute top-[0px] left-[0px] z-[0] w-[70px] h-[40px] opacity-[1]" src="./assets/Puzzle/IMG_1.svg" />
          <img alt="" data-type="IMAGE" className="absolute top-[0px] left-[294px] z-[1] w-[96px] h-[40px] opacity-[1]" src="./assets/Puzzle/IMG_2.svg" />
        </div>
      </div>
      <div data-type="CONTAINER" className="w-[32px] h-[32px] absolute top-[46px] left-[14px] z-[4] bg-[#008FF0]/[1] rounded-[16px] shadow-[0px_2px_8px_0px_#13202E59] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <img alt="" data-type="ICON" className="absolute top-[8px] left-[8px] z-[0] w-[16px] h-[16px] text-[#F2F7FD]/[1] opacity-[1]" data-icon="Lucide_compass_Outlined" src="./assets/Puzzle/IMG_3.svg" />
        </div>
      </div>
      <div data-type="CONTAINER" className="w-[126px] h-[16px] absolute top-[46px] left-[54px] z-[6] bg-[#000000]/[0] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit] overflow-hidden">
          <span data-type="TEXT" className="absolute top-[0px] left-[0px] z-[0] whitespace-pre text-[#F2F7FD]/[1] font-['Plus_Jakarta_Sans'] text-[10px] leading-[16px] font-[700] text-left tracking-[0px] uppercase opacity-[1]">XJTLU AR QUEST</span>
        </div>
      </div>
      <button type="button" aria-label="Toggle sound" onClick={() => act("Lucide_volume-2_Outlined")} data-type="BUTTON" className="absolute top-[46px] left-[308px] z-[2] min-w-[32px] h-[32px] flex items-center justify-center gap-[0px] bg-[#000000]/[0] rounded-[14px] opacity-[1]">
        <img alt="" className="w-[16px] h-[16px] text-[#A6B7CA]/[1]" data-icon="Lucide_volume-2_Outlined" src="./assets/Puzzle/IMG_4.svg" />
      </button>
      <button type="button" aria-label="Settings" onClick={() => act("Lucide_settings_Outlined")} data-type="BUTTON" className="absolute top-[46px] left-[344px] z-[3] min-w-[32px] h-[32px] flex items-center justify-center gap-[0px] bg-[#000000]/[0] rounded-[14px] opacity-[1]">
        <img alt="" className="w-[16px] h-[16px] text-[#A6B7CA]/[1]" data-icon="Lucide_settings_Outlined" src="./assets/Puzzle/IMG_5.svg" />
      </button>
      <div data-type="CONTAINER" className="w-[59px] h-[25px] absolute top-[49px] left-[245px] z-[1] bg-[#2B3A4A]/[0.6] rounded-[14px] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <span data-type="TEXT" className="absolute top-[4px] left-[24px] z-[1] whitespace-pre text-[#A6B7CA]/[1] font-['JetBrains_Mono'] text-[11px] leading-[17px] font-[400] text-left tracking-[0px] opacity-[1]">DEMO</span>
          <img alt="" data-type="ICON" className="absolute top-[6px] left-[8px] z-[0] w-[12px] h-[12px] text-[#10B981]/[1] opacity-[1]" data-icon="Lucide_radio_Outlined" src="./assets/Puzzle/IMG_6.svg" />
        </div>
      </div>
      <div data-type="RECTANGLE" className="absolute top-[50px] left-[163px] z-[7] w-[8px] h-[8px] bg-[#34D399]/[1] rounded-[9999px] opacity-[0.75]" />
      <div data-type="RECTANGLE" className="absolute top-[50px] left-[163px] z-[8] w-[8px] h-[8px] bg-[#10B981]/[1] rounded-[9999px] opacity-[1]" />
      <div data-type="CONTAINER" className="w-[118px] h-[15px] absolute top-[62px] left-[54px] z-[5] bg-[#000000]/[0] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit] overflow-hidden">
          <span data-type="TEXT" className="absolute top-[0px] left-[0px] z-[0] whitespace-pre text-[#A6B7CA]/[1] font-['Plus_Jakarta_Sans'] text-[10px] leading-[15px] font-[500] text-left tracking-[0px] opacity-[1]">Taicang · Demo AR</span>
        </div>
      </div>
      <div data-type="CONTAINER" className="w-[362px] h-[31px] absolute top-[86px] left-[14px] z-[9] bg-[#000000]/[0] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <div data-type="DIVIDER" className="absolute top-[0px] left-[0px] z-[0] w-[362px] h-[0px] border-t-[1px] border-[#445668]/[0.5]" />
          <button type="button" aria-label={q.room} onClick={() => act("7K3D")} data-type="BUTTON" className="absolute top-[5px] left-[44px] z-[2] min-w-[73px] h-[26px] px-[10px] flex items-center justify-start gap-[6px] bg-[#2B3A4A]/[1] border-[1px] border-[#445668]/[0.6] rounded-[14px] opacity-[1]">
            <span className="whitespace-nowrap text-[12px] leading-[20px] font-[700] font-['JetBrains_Mono'] text-[#F2F7FD]/[1]">{q.room}</span>
            <img alt="" className="w-[14px] h-[14px] text-[#A6B7CA]/[1]" data-icon="Lucide_copy_Outlined" src="./assets/Puzzle/IMG_7.svg" />
          </button>
          <div data-type="TAG" data-style="OUTLINED" className="absolute top-[7px] left-[275px] z-[4] w-[83px] h-[20px] flex items-center justify-center gap-[4px] opacity-[1]">
            <div data-type="TAG_ITEM" className="relative w-[83px] h-[20px] flex items-center justify-center px-[8px] bg-[#10B981]/[0.1] border-[1px] border-[#10B981]/[0.3] rounded-[10px] gap-[4px] opacity-[1]">
              <span className="whitespace-nowrap text-[10px] leading-[16px] font-[700] font-['Plus_Jakarta_Sans'] text-[#059669]/[1]"> PUZZLE SYNC </span>
            </div>
          </div>
          <div data-type="CONTAINER" className="w-[53px] h-[20px] absolute top-[8px] left-[216px] z-[3] bg-[#00486D]/[1] rounded-[9999px] opacity-[1]">
            <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
              <span data-type="TEXT" className="absolute top-[2px] left-[24px] z-[1] whitespace-pre text-[#D3ECFF]/[1] font-['Plus_Jakarta_Sans'] text-[12px] leading-[16px] font-[600] text-left tracking-[0px] opacity-[1]">3/3</span>
              <img alt="" data-type="ICON" className="absolute top-[4px] left-[8px] z-[0] w-[12px] h-[12px] text-[#A6B7CA]/[1] opacity-[1]" data-icon="Lucide_users_Outlined" src="./assets/Puzzle/IMG_8.svg" />
            </div>
          </div>
          <span data-type="TEXT" className="absolute top-[10px] left-[0px] z-[1] whitespace-pre text-[#A6B7CA]/[1] font-['Plus_Jakarta_Sans'] text-[11px] leading-[17px] font-[600] text-left tracking-[1px] uppercase opacity-[1]">Room</span>
        </div>
      </div>
      <div data-type="DIVIDER" className="absolute top-[128px] left-[0px] z-[0] w-[390px] h-[0px] border-t-[1px] border-[#445668]/[1]" />
    </div>
  </div>
  <div data-type="CONTAINER" className="w-[362px] h-[56px] absolute top-[140px] left-[14px] z-[0] bg-[#1F2D3C]/[1] rounded-[12px] shadow-[0px_1px_3px_0px_#13202E40] opacity-[1]">
    <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
      <span data-type="TEXT" className="absolute top-[11px] left-[47px] z-[1] whitespace-pre text-[#008FF0]/[1] font-['Chakra_Petch'] text-[11px] leading-[14px] font-[600] text-left tracking-[1px] uppercase opacity-[1]">PHASE 5/6</span>
      <div data-type="CONTAINER" className="w-[28px] h-[28px] absolute top-[14px] left-[11px] z-[0] bg-[#008FF0]/[0.15] rounded-[16px] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <img alt="" data-type="ICON" className="absolute top-[6px] left-[6px] z-[0] w-[16px] h-[16px] text-[#008FF0]/[1] opacity-[1]" data-icon="Lucide_puzzle_Outlined" src="./assets/Puzzle/IMG_9.svg" />
        </div>
      </div>
      <div data-type="CONTAINER" className="w-[85px] h-[28px] absolute top-[14px] left-[266px] z-[4] bg-[#2B3A4A]/[1] rounded-[16px] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <span data-type="TEXT" className="absolute top-[5px] left-[31px] z-[1] whitespace-pre text-[#F2F7FD]/[1] font-['JetBrains_Mono'] text-[13px] leading-[18px] font-[700] text-left tracking-[1px] opacity-[1]">{q.elapsed}</span>
          <img alt="" data-type="ICON" className="absolute top-[7px] left-[11px] z-[0] w-[14px] h-[14px] text-[#F59E0B]/[1] opacity-[1]" data-icon="Lucide_timer_Outlined" src="./assets/Puzzle/IMG_10.svg" />
        </div>
        <div data-role="ELEMENT_BORDER" className="absolute inset-0 z-[1] bg-transparent pointer-events-none rounded-[inherit] border-[1px] border-[#445668]/[1]" />
      </div>
      <div data-type="RECTANGLE" className="absolute top-[15px] left-[117px] z-[2] w-[6px] h-[6px] bg-[#10B981]/[1] rounded-[9999px] opacity-[1]" />
      <span data-type="TEXT" className="absolute top-[25px] left-[47px] z-[3] whitespace-pre text-[#F2F7FD]/[1] font-['Plus_Jakarta_Sans'] text-[15px] leading-[20px] font-[600] text-left tracking-[0px] opacity-[1]">Multiplayer Puzzle</span>
    </div>
    <div data-role="ELEMENT_BORDER" className="absolute inset-0 z-[1] bg-transparent pointer-events-none rounded-[inherit] border-[1px] border-[#445668]/[0.8]" />
  </div>
  <div data-type="CONTAINER" className="w-[362px] h-[40px] absolute top-[210px] left-[14px] z-[1] bg-[#2B3A4A]/[0.6] rounded-[12px] opacity-[1]">
    <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
      <button type="button" aria-label="Dual HUD" onClick={() => act("Dual HUD")} aria-pressed={q.view === "Dual HUD"} data-type="BUTTON" className="absolute top-[5px] left-[5px] z-[0] min-w-[115px] h-[30px] px-[8px] flex items-center justify-center gap-[4px] bg-[#1F2D3C]/[1] border-[1px] border-[#445668]/[0.8] rounded-[16px] shadow-[0px_1px_3px_0px_#13202E40] opacity-[1]">
        <img alt="" className="w-[14px] h-[14px] text-[#F2F7FD]/[1]" data-icon="Lucide_layers_Outlined" src="./assets/Puzzle/IMG_11.svg" />
        <span className="whitespace-nowrap text-[12px] leading-[20px] font-[600] font-['Plus_Jakarta_Sans'] text-[#F2F7FD]/[1]"> Dual HUD </span>
      </button>
      <button type="button" aria-label="Teammate A" onClick={() => act("Teammate A")} aria-pressed={q.view === "Teammate A"} data-type="BUTTON" className="absolute top-[6px] left-[125px] z-[1] min-w-[113px] h-[28px] px-[8px] flex items-center justify-center gap-[4px] bg-[#000000]/[0] rounded-[16px] opacity-[1]">
        <img alt="" className="w-[14px] h-[14px] text-[#A6B7CA]/[1]" data-icon="Lucide_eye_Outlined" src="./assets/Puzzle/IMG_12.svg" />
        <span className="whitespace-nowrap text-[12px] leading-[20px] font-[600] font-['Plus_Jakarta_Sans'] text-[#A6B7CA]/[1]"> Teammate A </span>
      </button>
      <button type="button" aria-label="Teammate B" onClick={() => act("Teammate B")} aria-pressed={q.view === "Teammate B"} data-type="BUTTON" className="absolute top-[6px] left-[244px] z-[2] min-w-[113px] h-[28px] px-[8px] flex items-center justify-center gap-[4px] bg-[#000000]/[0] rounded-[16px] opacity-[1]">
        <img alt="" className="w-[14px] h-[14px] text-[#A6B7CA]/[1]" data-icon="Lucide_cpu_Outlined" src="./assets/Puzzle/IMG_13.svg" />
        <span className="whitespace-nowrap text-[12px] leading-[20px] font-[600] font-['Plus_Jakarta_Sans'] text-[#A6B7CA]/[1]"> Teammate B </span>
      </button>
    </div>
    <div data-role="ELEMENT_BORDER" className="absolute inset-0 z-[1] bg-transparent pointer-events-none rounded-[inherit] border-[1px] border-[#445668]/[0.5]" />
  </div>
  <div data-type="CONTAINER" className="w-[362px] h-[288px] absolute top-[264px] left-[14px] z-[5] bg-[#1F2D3C]/[0.9] rounded-[16px] shadow-[0px_2px_8px_0px_#13202E59] opacity-[1]">
    <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit] overflow-hidden">
      <div data-type="CONTAINER" className="w-[362px] h-[40px] absolute top-[0px] left-[0px] z-[0] bg-[#000000]/[0] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <div data-type="TAG" data-style="OUTLINED" className="absolute top-[10px] left-[10px] z-[1] w-[83px] h-[20px] flex items-center justify-center gap-[4px] opacity-[1]">
            <div data-type="TAG_ITEM" className="relative w-[83px] h-[20px] flex items-center justify-center px-[10px] bg-[#008FF0]/[0.1] border-[1px] border-[#008FF0]/[0.3] rounded-[10px] gap-[4px] opacity-[1]">
              <span className="whitespace-nowrap text-[10px] leading-[16px] font-[600] font-['Plus_Jakarta_Sans'] text-[#008FF0]/[1]"> TEAMMATE A </span>
            </div>
          </div>
          <span data-type="TEXT" className="absolute top-[13px] left-[100px] z-[2] whitespace-pre text-[#F2F7FD]/[1] font-['Plus_Jakarta_Sans'] text-[12px] leading-[16px] font-[700] text-left tracking-[0px] opacity-[1]">AR Optical Matrix</span>
          <span data-type="TEXT" className="absolute top-[17px] left-[270px] z-[3] whitespace-pre text-[#A6B7CA]/[1] font-['JetBrains_Mono'] text-[11px] leading-[14px] font-[500] text-left tracking-[0px] opacity-[1]">FEED // DEMO</span>
          <div data-type="DIVIDER" className="absolute top-[40px] left-[0px] z-[0] w-[362px] h-[0px] border-t-[1px] border-[#445668]/[0.4]" />
        </div>
      </div>
      <div data-type="CONTAINER" className="w-[342px] h-[228px] absolute top-[50px] left-[10px] z-[1] bg-[#2B3A4A]/[0.4] rounded-[16px] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit] overflow-hidden">
          <div data-type="IMAGE" className="absolute top-[1px] left-[1px] z-[0] w-[340px] h-[228px] opacity-[1] overflow-hidden">
            <img alt="" src="./assets/Puzzle/IMG_14.webp" className="absolute max-w-none max-h-none top-[-141px] left-[0px] w-[340px] h-[510px]" />
          </div>
          <div data-type="CONTAINER" className="w-[324px] h-[210px] absolute top-[9px] left-[9px] z-[1] bg-[#000000]/[0] rounded-[4px] opacity-[1]">
            <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
              <div data-type="DIVIDER" className="absolute top-[-4px] left-[-3px] z-[0] w-[12px] h-[0px] border-t-[2px] border-[#22D3EE]/[1]" />
              <div data-type="DIVIDER" className="absolute top-[-4px] left-[-3px] z-[1] w-[12px] h-[0px] border-t-[2px] border-[#22D3EE]/[1] rotate-[90deg] origin-left" />
              <div data-type="DIVIDER" className="absolute top-[-4px] left-[315px] z-[2] w-[12px] h-[0px] border-t-[2px] border-[#22D3EE]/[1]" />
              <div data-type="DIVIDER" className="absolute top-[-4px] left-[327px] z-[3] w-[12px] h-[0px] border-t-[2px] border-[#22D3EE]/[1] rotate-[90deg] origin-left" />
              <div data-type="RECTANGLE" className="absolute top-[81px] left-[138px] z-[9] w-[48px] h-[48px] bg-[#000000]/[0] border-[1px] border-[#22D3EE]/[0.7] rounded-[9999px] opacity-[0.5]" />
              <div data-type="CONTAINER" className="w-[32px] h-[32px] absolute top-[89px] left-[146px] z-[8] bg-[#06B6D4]/[0.2] rounded-[9999px] opacity-[1]">
                <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
                  <span data-type="TEXT" className="absolute top-[9px] left-[8px] z-[0] whitespace-pre text-[#A5F3FC]/[1] font-['JetBrains_Mono'] text-[9px] leading-[14px] font-[700] text-left tracking-[0px] opacity-[1]">#03</span>
                </div>
                <div data-role="ELEMENT_BORDER" className="absolute inset-0 z-[1] bg-transparent pointer-events-none rounded-[inherit] border-[2px] border-[#67E8F9]/[1]" />
              </div>
              <div data-type="DIVIDER" className="absolute top-[200px] left-[-3px] z-[5] w-[12px] h-[0px] border-t-[2px] border-[#22D3EE]/[1] rotate-[90deg] origin-left" />
              <div data-type="DIVIDER" className="absolute top-[200px] left-[327px] z-[6] w-[12px] h-[0px] border-t-[2px] border-[#22D3EE]/[1] rotate-[90deg] origin-left" />
              <div data-type="DIVIDER" className="absolute top-[212px] left-[-3px] z-[4] w-[12px] h-[0px] border-t-[2px] border-[#22D3EE]/[1]" />
              <div data-type="DIVIDER" className="absolute top-[212px] left-[315px] z-[7] w-[12px] h-[0px] border-t-[2px] border-[#22D3EE]/[1]" />
            </div>
            <div data-role="ELEMENT_BORDER" className="absolute inset-0 z-[1] bg-transparent pointer-events-none rounded-[inherit] border-[1px] border-[#22D3EE]/[0.4]" />
          </div>
          <div data-type="CONTAINER" className="w-[328px] h-[25px] absolute top-[196px] left-[7px] z-[2] bg-[#13202E]/[0.8] rounded-[4px] opacity-[1]">
            <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
              <span data-type="TEXT" className="absolute top-[5px] left-[9px] z-[0] whitespace-pre text-[#A6B7CA]/[1] font-['JetBrains_Mono'] text-[10px] leading-[15px] font-[400] text-left tracking-[0px] opacity-[1]">TARGET: LIB-WEST PLAZA</span>
              <span data-type="TEXT" className="absolute top-[5px] left-[270px] z-[2] whitespace-pre text-[#10B981]/[1] font-['Plus_Jakarta_Sans'] text-[10px] leading-[15px] font-[600] text-left tracking-[0px] opacity-[1]"> MATCHED</span>
              <img alt="" data-type="ICON" className="absolute top-[6px] left-[254px] z-[1] w-[12px] h-[12px] text-[#10B981]/[1] opacity-[1]" data-icon="Lucide_circle-check_Outlined" src="./assets/Puzzle/IMG_15.svg" />
            </div>
            <div data-role="ELEMENT_BORDER" className="absolute inset-0 z-[1] bg-transparent pointer-events-none rounded-[inherit] border-[1px] border-[#445668]/[0.6]" />
          </div>
        </div>
        <div data-role="ELEMENT_BORDER" className="absolute inset-0 z-[1] bg-transparent pointer-events-none rounded-[inherit] border-[1px] border-[#445668]/[0.6]" />
      </div>
    </div>
  </div>
  <div data-type="CONTAINER" className="w-[362px] h-[188px] absolute top-[564px] left-[14px] z-[4] bg-[#1F2D3C]/[0.9] rounded-[16px] shadow-[0px_2px_8px_0px_#13202E59] opacity-[1]">
    <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
      <div data-type="CONTAINER" className="w-[362px] h-[40px] absolute top-[0px] left-[0px] z-[0] bg-[#000000]/[0] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <div data-type="TAG" data-style="OUTLINED" className="absolute top-[10px] left-[10px] z-[1] w-[83px] h-[20px] flex items-center justify-center gap-[4px] opacity-[1]">
            <div data-type="TAG_ITEM" className="relative w-[83px] h-[20px] flex items-center justify-center px-[10px] bg-[#06B6D4]/[0.1] border-[1px] border-[#06B6D4]/[0.3] rounded-[10px] gap-[4px] opacity-[1]">
              <span className="whitespace-nowrap text-[10px] leading-[16px] font-[600] font-['Plus_Jakarta_Sans'] text-[#0891B2]/[1]"> TEAMMATE B </span>
            </div>
          </div>
          <span data-type="TEXT" className="absolute top-[13px] left-[100px] z-[2] whitespace-pre text-[#F2F7FD]/[1] font-['Plus_Jakarta_Sans'] text-[12px] leading-[16px] font-[700] text-left tracking-[0px] opacity-[1]">Motto Inscription Plaque</span>
          <span data-type="TEXT" className="absolute top-[17px] left-[284px] z-[3] whitespace-pre text-[#A6B7CA]/[1] font-['JetBrains_Mono'] text-[11px] leading-[14px] font-[500] text-left tracking-[0px] opacity-[1]">CIPHER KEY</span>
          <div data-type="DIVIDER" className="absolute top-[40px] left-[0px] z-[0] w-[362px] h-[0px] border-t-[1px] border-[#445668]/[0.4]" />
        </div>
      </div>
      <div data-type="CONTAINER" className="w-[338px] h-[124px] absolute top-[52px] left-[12px] z-[1] bg-[#2B3A4A]/[0.5] rounded-[16px] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <span data-type="TEXT" className="absolute top-[13px] left-[80px] z-[0] whitespace-pre text-[#A6B7CA]/[1] font-['JetBrains_Mono'] text-[11px] leading-[17px] font-[400] text-center tracking-[1px] uppercase opacity-[1]">Campus Inscription Clue</span>
          <div data-type="CONTAINER" className="w-[61px] h-[22px] absolute top-[32px] left-[242px] z-[1] bg-[#F59E0B]/[0.1] rounded-[4px] opacity-[1]">
            <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
              <span data-type="TEXT" className="absolute top-[1px] left-[5px] z-[0] whitespace-pre text-[#F59E0B]/[1] font-['Plus_Jakarta_Sans'] text-[12px] leading-[20px] font-[800] text-center tracking-[1px] uppercase opacity-[1]">ACTION</span>
            </div>
            <div data-role="ELEMENT_BORDER" className="absolute inset-0 z-[1] bg-transparent pointer-events-none rounded-[inherit] border-[1px] border-[#F59E0B]/[0.3]" />
          </div>
          <span data-type="TEXT" className="absolute top-[34px] left-[45px] z-[2] whitespace-pre text-[#F2F7FD]/[1] font-['Plus_Jakarta_Sans'] text-[12px] leading-[20px] font-[700] text-center tracking-[0px] uppercase opacity-[1]"><span className="text-[#F2F7FD]/[1] text-[12px] font-[700] font-['Plus_Jakarta_Sans'] uppercase">“</span><span className="text-[#008FF0]/[1] text-[12px] font-[700] font-['Plus_Jakarta_Sans'] underline uppercase">WATER</span><span className="text-[#F2F7FD]/[1] text-[12px] font-[700] font-['Plus_Jakarta_Sans'] uppercase"> MIRRORS THE </span><span className="text-[#008FF0]/[1] text-[12px] font-[700] font-['Plus_Jakarta_Sans'] underline uppercase">WORLD</span><span className="text-[#F2F7FD]/[1] text-[12px] font-[700] font-['Plus_Jakarta_Sans'] uppercase"> •</span></span>
          <span data-type="TEXT" className="absolute top-[53px] left-[105px] z-[3] whitespace-pre text-[#F2F7FD]/[1] font-['Plus_Jakarta_Sans'] text-[12px] leading-[20px] font-[700] text-center tracking-[0px] uppercase opacity-[1]"><span className="text-[#F2F7FD]/[1] text-[12px] font-[700] font-['Plus_Jakarta_Sans'] uppercase">SHAPES THE </span><span className="text-[#008FF0]/[1] text-[12px] font-[700] font-['Plus_Jakarta_Sans'] underline uppercase">FUTURE</span><span className="text-[#F2F7FD]/[1] text-[12px] font-[700] font-['Plus_Jakarta_Sans'] uppercase">”</span></span>
          <span data-type="TEXT" className="absolute top-[81px] left-[18px] z-[4] w-[302px] text-[#A6B7CA]/[1] font-['Plus_Jakarta_Sans'] text-[10px] leading-[15px] font-[400] text-center tracking-[0px] opacity-[1]">Extract the primary imperative verb aligned with Optical Target #03.</span>
        </div>
        <div data-role="ELEMENT_BORDER" className="absolute inset-0 z-[1] bg-transparent pointer-events-none rounded-[inherit] border-[1px] border-dashed border-[#445668]/[1]" />
      </div>
    </div>
  </div>
  <div data-type="CONTAINER" className="w-[362px] h-[345px] absolute top-[765px] left-[14px] z-[6] bg-[#1F2D3C]/[1] rounded-[16px] shadow-[0px_2px_8px_0px_#13202E59] opacity-[1]">
    <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
      <span data-type="TEXT" className="absolute top-[12px] left-[28px] z-[1] w-[151px] text-[#F2F7FD]/[1] font-['Plus_Jakarta_Sans'] text-[24px] leading-[24px] font-[600] text-left tracking-[-1px] opacity-[1]">Squad Cipher Matrix</span>
      <span data-type="TEXT" className="absolute top-[25px] left-[239px] z-[2] w-[62px] text-[#A6B7CA]/[1] font-['JetBrains_Mono'] text-[11px] leading-[14px] font-[500] text-left tracking-[0px] opacity-[1]">{q.answer ? "4/4 SLOTS SYNCHED" : "3/4 SLOTS SYNCHED"}</span>
      <div data-type="RECTANGLE" className="absolute top-[32px] left-[12px] z-[0] w-[8px] h-[8px] bg-[#008FF0]/[1] rounded-[9999px] opacity-[1]" />
      <div data-type="CONTAINER" className="w-[165px] h-[90px] absolute top-[72px] left-[12px] z-[9] bg-[#2B3A4A]/[0.4] rounded-[12px] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <span data-type="TEXT" className="absolute top-[11px] left-[11px] z-[0] whitespace-pre text-[#A6B7CA]/[1] font-['JetBrains_Mono'] text-[10px] leading-[15px] font-[600] text-left tracking-[0px] uppercase opacity-[1]">Node Alpha</span>
          <img alt="" data-type="ICON" className="absolute top-[12px] left-[142px] z-[1] w-[12px] h-[12px] text-[#10B981]/[1] opacity-[1]" data-icon="Lucide_circle-check_Outlined" src="./assets/Puzzle/IMG_15.svg" />
          <div data-type="CONTAINER" className="w-[143px] h-[26px] absolute top-[32px] left-[11px] z-[2] bg-[#13202E]/[0.8] rounded-[14px] opacity-[1]">
            <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
              <span data-type="TEXT" className="absolute top-[5px] left-[52px] z-[0] whitespace-pre text-[#F2F7FD]/[1] font-['JetBrains_Mono'] text-[12px] leading-[16px] font-[700] text-left tracking-[1px] opacity-[1]">WATER</span>
            </div>
            <div data-role="ELEMENT_BORDER" className="absolute inset-0 z-[1] bg-transparent pointer-events-none rounded-[inherit] border-[1px] border-[#445668]/[0.5]" />
          </div>
          <div data-type="CONTAINER" className="w-[59px] h-[15px] absolute top-[64px] left-[11px] z-[3] bg-[#000000]/[0] opacity-[1]">
            <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit] overflow-hidden">
              <span data-type="TEXT" className="absolute top-[0px] left-[0px] z-[0] whitespace-pre text-[#A6B7CA]/[1] font-['Plus_Jakarta_Sans'] text-[10px] leading-[15px] font-[400] text-left tracking-[0px] opacity-[1]">Teammate A</span>
            </div>
          </div>
          <img alt="" data-type="ICON" className="absolute top-[65px] left-[142px] z-[4] w-[12px] h-[12px] text-[#10B981]/[1] opacity-[1]" data-icon="Lucide_lock-open_Outlined" src="./assets/Puzzle/IMG_16.svg" />
        </div>
        <div data-role="ELEMENT_BORDER" className="absolute inset-0 z-[1] bg-transparent pointer-events-none rounded-[inherit] border-[1px] border-[#445668]/[0.7]" />
      </div>
      <div data-type="CONTAINER" className="w-[165px] h-[90px] absolute top-[72px] left-[185px] z-[10] bg-[#2B3A4A]/[0.4] rounded-[12px] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <span data-type="TEXT" className="absolute top-[11px] left-[11px] z-[0] whitespace-pre text-[#A6B7CA]/[1] font-['JetBrains_Mono'] text-[10px] leading-[15px] font-[600] text-left tracking-[0px] uppercase opacity-[1]">Node Beta</span>
          <img alt="" data-type="ICON" className="absolute top-[12px] left-[142px] z-[1] w-[12px] h-[12px] text-[#10B981]/[1] opacity-[1]" data-icon="Lucide_circle-check_Outlined" src="./assets/Puzzle/IMG_15.svg" />
          <div data-type="CONTAINER" className="w-[143px] h-[26px] absolute top-[32px] left-[11px] z-[2] bg-[#13202E]/[0.8] rounded-[14px] opacity-[1]">
            <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
              <span data-type="TEXT" className="absolute top-[5px] left-[44px] z-[0] whitespace-pre text-[#F2F7FD]/[1] font-['JetBrains_Mono'] text-[12px] leading-[16px] font-[700] text-left tracking-[1px] opacity-[1]">MIRRORS</span>
            </div>
            <div data-role="ELEMENT_BORDER" className="absolute inset-0 z-[1] bg-transparent pointer-events-none rounded-[inherit] border-[1px] border-[#445668]/[0.5]" />
          </div>
          <div data-type="CONTAINER" className="w-[59px] h-[15px] absolute top-[64px] left-[11px] z-[3] bg-[#000000]/[0] opacity-[1]">
            <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit] overflow-hidden">
              <span data-type="TEXT" className="absolute top-[0px] left-[0px] z-[0] whitespace-pre text-[#A6B7CA]/[1] font-['Plus_Jakarta_Sans'] text-[10px] leading-[15px] font-[400] text-left tracking-[0px] opacity-[1]">Teammate B</span>
            </div>
          </div>
          <img alt="" data-type="ICON" className="absolute top-[65px] left-[142px] z-[4] w-[12px] h-[12px] text-[#10B981]/[1] opacity-[1]" data-icon="Lucide_lock-open_Outlined" src="./assets/Puzzle/IMG_16.svg" />
        </div>
        <div data-role="ELEMENT_BORDER" className="absolute inset-0 z-[1] bg-transparent pointer-events-none rounded-[inherit] border-[1px] border-[#445668]/[0.7]" />
      </div>
      <div data-type="CONTAINER" className="w-[165px] h-[91px] absolute top-[170px] left-[12px] z-[11] bg-[#008FF0]/[0.1] rounded-[12px] shadow-[0px_1px_3px_0px_#13202E40] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <span data-type="TEXT" className="absolute top-[11px] left-[11px] z-[0] whitespace-pre text-[#A6B7CA]/[1] font-['JetBrains_Mono'] text-[10px] leading-[15px] font-[600] text-left tracking-[0px] uppercase opacity-[1]">Node Gamma</span>
          <div data-type="TAG" data-style="SOLID" className="absolute top-[11px] left-[95px] z-[1] w-[57px] h-[20px] flex items-center justify-center gap-[4px] opacity-[1]">
            <div data-type="TAG_ITEM" className="relative w-[57px] h-[20px] flex items-center justify-center px-[6px] bg-[#008FF0]/[1] rounded-[10px] gap-[4px] opacity-[1]">
              <span className="whitespace-nowrap text-[9px] leading-[14px] font-[600] font-['Plus_Jakarta_Sans'] text-[#F2F7FD]/[1]"> YOUR KEY </span>
            </div>
          </div>
          <div data-type="CONTAINER" className="w-[143px] h-[26px] absolute top-[32px] left-[11px] z-[2] bg-[#13202E]/[0.8] rounded-[14px] opacity-[1]">
            <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
              <span data-type="TEXT" className="absolute top-[5px] left-[48px] z-[0] whitespace-pre text-[#F2F7FD]/[1] font-['JetBrains_Mono'] text-[12px] leading-[16px] font-[700] text-left tracking-[1px] opacity-[1]">{q.answer || "—"}</span>
            </div>
            <div data-role="ELEMENT_BORDER" className="absolute inset-0 z-[1] bg-transparent pointer-events-none rounded-[inherit] border-[1px] border-[#445668]/[0.5]" />
          </div>
          <div data-type="CONTAINER" className="w-[56px] h-[15px] absolute top-[64px] left-[11px] z-[3] bg-[#000000]/[0] opacity-[1]">
            <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit] overflow-hidden">
              <span data-type="TEXT" className="absolute top-[0px] left-[0px] z-[0] whitespace-pre text-[#A6B7CA]/[1] font-['Plus_Jakarta_Sans'] text-[10px] leading-[15px] font-[400] text-left tracking-[0px] opacity-[1]">Me (Leader)</span>
            </div>
          </div>
          <img alt="" data-type="ICON" className="absolute top-[66px] left-[142px] z-[4] w-[12px] h-[12px] text-[#10B981]/[1] opacity-[1]" data-icon="Lucide_lock-open_Outlined" src="./assets/Puzzle/IMG_16.svg" />
        </div>
        <div data-role="ELEMENT_BORDER" className="absolute inset-0 z-[1] bg-transparent pointer-events-none rounded-[inherit] border-[1px] border-[#008FF0]/[1]" />
      </div>
      <div data-type="CONTAINER" className="w-[165px] h-[91px] absolute top-[170px] left-[185px] z-[12] bg-[#2B3A4A]/[0.4] rounded-[12px] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <span data-type="TEXT" className="absolute top-[11px] left-[11px] z-[0] whitespace-pre text-[#A6B7CA]/[1] font-['JetBrains_Mono'] text-[10px] leading-[15px] font-[600] text-left tracking-[0px] uppercase opacity-[1]">Node Delta</span>
          <img alt="" data-type="ICON" className="absolute top-[12px] left-[142px] z-[1] w-[12px] h-[12px] text-[#10B981]/[1] opacity-[1]" data-icon="Lucide_circle-check_Outlined" src="./assets/Puzzle/IMG_15.svg" />
          <div data-type="CONTAINER" className="w-[143px] h-[26px] absolute top-[32px] left-[11px] z-[2] bg-[#13202E]/[0.8] rounded-[14px] opacity-[1]">
            <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
              <span data-type="TEXT" className="absolute top-[5px] left-[48px] z-[0] whitespace-pre text-[#F2F7FD]/[1] font-['JetBrains_Mono'] text-[12px] leading-[16px] font-[700] text-left tracking-[1px] opacity-[1]">FUTURE</span>
            </div>
            <div data-role="ELEMENT_BORDER" className="absolute inset-0 z-[1] bg-transparent pointer-events-none rounded-[inherit] border-[1px] border-[#445668]/[0.5]" />
          </div>
          <div data-type="CONTAINER" className="w-[57px] h-[15px] absolute top-[64px] left-[11px] z-[3] bg-[#000000]/[0] opacity-[1]">
            <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit] overflow-hidden">
              <span data-type="TEXT" className="absolute top-[0px] left-[0px] z-[0] whitespace-pre text-[#A6B7CA]/[1] font-['Plus_Jakarta_Sans'] text-[10px] leading-[15px] font-[400] text-left tracking-[0px] opacity-[1]">Squad Sync</span>
            </div>
          </div>
          <img alt="" data-type="ICON" className="absolute top-[65px] left-[142px] z-[4] w-[12px] h-[12px] text-[#10B981]/[1] opacity-[1]" data-icon="Lucide_lock-open_Outlined" src="./assets/Puzzle/IMG_16.svg" />
        </div>
        <div data-role="ELEMENT_BORDER" className="absolute inset-0 z-[1] bg-transparent pointer-events-none rounded-[inherit] border-[1px] border-[#445668]/[0.7]" />
      </div>
      <span data-type="TEXT" className="absolute top-[276px] left-[12px] z-[3] whitespace-pre text-[#F2F7FD]/[1] font-['Plus_Jakarta_Sans'] text-[12px] leading-[16px] font-[700] text-left tracking-[0px] opacity-[1]">Select Your Decrypted Key (Node Gamma):</span>
      <span data-type="TEXT" className="absolute top-[277px] left-[297px] z-[4] whitespace-pre text-[#A6B7CA]/[1] font-['Plus_Jakarta_Sans'] text-[10px] leading-[15px] font-[400] text-left tracking-[0px] opacity-[1]">Tap to sync</span>
      <button type="button" aria-label="ACTION" onClick={() => act("ACTION")} aria-pressed={q.answer === "ACTION"} data-type="BUTTON" className="absolute top-[298px] left-[12px] z-[5] min-w-[80px] h-[34px] px-[4px] flex items-center justify-center gap-[0px] bg-[#008FF0]/[1] border-[1px] border-[#008FF0]/[1] rounded-[16px] shadow-[0px_1px_3px_0px_#13202E40] opacity-[1]">
        <span className="whitespace-nowrap text-[12px] leading-[20px] font-[700] font-['JetBrains_Mono'] text-[#F2F7FD]/[1]"> ACTION </span>
      </button>
      <button type="button" aria-label="VISION" onClick={() => act("VISION")} aria-pressed={q.answer === "VISION"} data-type="BUTTON" className="absolute top-[298px] left-[98px] z-[6] min-w-[80px] h-[34px] px-[4px] flex items-center justify-center gap-[0px] bg-[#2B3A4A]/[0.7] border-[1px] border-[#445668]/[0.7] rounded-[16px] opacity-[1]">
        <span className="whitespace-nowrap text-[12px] leading-[20px] font-[700] font-['JetBrains_Mono'] text-[#F2F7FD]/[1]"> VISION </span>
      </button>
      <button type="button" aria-label="ENERGY" onClick={() => act("ENERGY")} aria-pressed={q.answer === "ENERGY"} data-type="BUTTON" className="absolute top-[298px] left-[184px] z-[7] min-w-[80px] h-[34px] px-[4px] flex items-center justify-center gap-[0px] bg-[#2B3A4A]/[0.7] border-[1px] border-[#445668]/[0.7] rounded-[16px] opacity-[1]">
        <span className="whitespace-nowrap text-[12px] leading-[20px] font-[700] font-['JetBrains_Mono'] text-[#F2F7FD]/[1]"> ENERGY </span>
      </button>
      <button type="button" aria-label="WISDOM" onClick={() => act("WISDOM")} aria-pressed={q.answer === "WISDOM"} data-type="BUTTON" className="absolute top-[298px] left-[270px] z-[8] min-w-[80px] h-[34px] px-[4px] flex items-center justify-center gap-[0px] bg-[#2B3A4A]/[0.7] border-[1px] border-[#445668]/[0.7] rounded-[16px] opacity-[1]">
        <span className="whitespace-nowrap text-[12px] leading-[20px] font-[700] font-['JetBrains_Mono'] text-[#F2F7FD]/[1]"> WISDOM </span>
      </button>
    </div>
  </div>
  <div data-type="CONTAINER" className="w-[362px] h-[109px] absolute top-[1124px] left-[14px] z-[7] bg-[#00486D]/[0.3] rounded-[12px] opacity-[1]">
    <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
      <img alt="" data-type="ICON" className="absolute top-[13px] left-[13px] z-[3] w-[16px] h-[16px] text-[#008FF0]/[1] opacity-[1]" data-icon="Lucide_sparkles_Outlined" src="./assets/Puzzle/IMG_17.svg" />
      <span data-type="TEXT" className="absolute top-[13px] left-[35px] z-[2] whitespace-pre text-[#F2F7FD]/[1] font-['Plus_Jakarta_Sans'] text-[12px] leading-[16px] font-[700] text-left tracking-[0px] opacity-[1]">AI Quest Companion</span>
      <button type="button" aria-label="Explain Solution" onClick={() => act("Explain Solution")} data-type="BUTTON" className="absolute top-[13px] left-[248px] z-[1] min-w-[101px] h-[18px] flex items-center justify-start gap-[4px] bg-[#000000]/[0] opacity-[1]">
        <img alt="" className="w-[12px] h-[12px] text-[#008FF0]/[1]" data-icon="Lucide_circle-help_Outlined" src="./assets/Puzzle/IMG_18.svg" />
        <span className="whitespace-nowrap text-[11px] leading-[18px] font-[600] font-['Plus_Jakarta_Sans'] text-[#008FF0]/[1]"> Explain Solution </span>
      </button>
      <span data-type="TEXT" className="absolute top-[38px] left-[13px] z-[0] w-[303px] text-[#A6B7CA]/[1] font-['Plus_Jakarta_Sans'] text-[12px] leading-[20px] font-[400] text-left tracking-[0px] opacity-[1]"><span className="text-[#F2F7FD]/[1] text-[12px] font-[700] font-['Plus_Jakarta_Sans']">AI Decipher Analysis:</span><span className="text-[#A6B7CA]/[1] text-[12px] font-[400] font-['Plus_Jakarta_Sans']"> The 3D campus coordinate in Teammate A's feed correlates with the dynamic verb </span><span className="text-[#008FF0]/[1] text-[12px] font-[700] font-['Plus_Jakarta_Sans']">"ACTION"</span><span className="text-[#A6B7CA]/[1] text-[12px] font-[400] font-['Plus_Jakarta_Sans']"> in the Taicang motto wall inscription.</span></span>
    </div>
    <div data-role="ELEMENT_BORDER" className="absolute inset-0 z-[1] bg-transparent pointer-events-none rounded-[inherit] border-[1px] border-[#445668]/[0.7]" />
  </div>
  <div data-type="CONTAINER" className="w-[342px] h-[210px] absolute top-[1249px] left-[16px] z-[8] bg-[#1F2D3C]/[0.95] rounded-[16px] shadow-[0px_12px_28px_0px_#13202E8c,_0px_0px_20px_0px_#008FF04d] backdrop-blur-[12px] opacity-[1]">
    <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
      <div data-type="CONTAINER" className="w-[45px] h-[20px] absolute top-[13px] left-[280px] z-[2] bg-[#00486D]/[1] rounded-[9999px] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <span data-type="TEXT" className="absolute top-[2px] left-[20px] z-[1] whitespace-pre text-[#D3ECFF]/[1] font-['Plus_Jakarta_Sans'] text-[10px] leading-[15px] font-[500] text-left tracking-[0px] opacity-[1]">3/3</span>
          <img alt="" data-type="ICON" className="absolute top-[5px] left-[7px] z-[0] w-[10px] h-[10px] text-[#D3ECFF]/[1] opacity-[1]" data-icon="Lucide_users_Outlined" src="./assets/Puzzle/IMG_8.svg" />
        </div>
      </div>
      <div data-type="CONTAINER" className="w-[150px] h-[16px] absolute top-[15px] left-[37px] z-[3] bg-[#000000]/[0] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit] overflow-hidden">
          <span data-type="TEXT" className="absolute top-[-1px] left-[0px] z-[0] whitespace-pre text-[#F2F7FD]/[1] font-['Plus_Jakarta_Sans'] text-[12px] leading-[16px] font-[600] text-left tracking-[0px] opacity-[1]">Squad Voice • Puzzle Room</span>
        </div>
      </div>
      <img alt="" data-type="ICON" className="absolute top-[16px] left-[17px] z-[4] w-[14px] h-[14px] text-[#008FF0]/[1] opacity-[1]" data-icon="Lucide_radio_Outlined" src="./assets/Puzzle/IMG_6.svg" />
      <div data-type="CONTAINER" className="w-[316px] h-[100px] absolute top-[43px] left-[13px] z-[5] bg-[#2B3A4A]/[0.4] rounded-[12px] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <div data-type="CONTAINER" className="w-[94px] h-[82px] absolute top-[9px] left-[9px] z-[0] bg-[#13202E]/[1] rounded-[16px] shadow-[0px_1px_3px_0px_#13202E40] opacity-[1]">
            <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
              <div data-type="AVATAR" data-style="IMAGE" className="absolute top-[8px] left-[30px] z-[4] w-[34px] h-[34px] flex items-center justify-center bg-[#ced0f8]/[1] rounded-[17px] opacity-[1]">
                <div data-role="AVATAR_CONTENT" className="w-full h-full rounded-[17px] overflow-hidden">
                  <img src="./assets/Puzzle/IMG_19.webp" className="w-full h-full object-cover" alt="avatar" />
                </div>
              </div>
              <div data-type="CONTAINER" className="w-[14px] h-[14px] absolute top-[30px] left-[56px] z-[5] bg-[#008FF0]/[1] rounded-[9999px] shadow-[0px_1px_3px_0px_#13202E40] opacity-[1]">
                <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
                  <img alt="" data-type="ICON" className="absolute top-[2px] left-[2px] z-[0] w-[10px] h-[10px] text-[#F2F7FD]/[1] opacity-[1]" data-icon="Lucide_volume-2_Outlined" src="./assets/Puzzle/IMG_4.svg" />
                </div>
              </div>
              <div data-type="CONTAINER" className="w-[17px] h-[14px] absolute top-[48px] left-[38px] z-[0] bg-[#000000]/[0] opacity-[1]">
                <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit] overflow-hidden">
                  <span data-type="TEXT" className="absolute top-[-1px] left-[0px] z-[0] whitespace-pre text-[#008FF0]/[1] font-['Plus_Jakarta_Sans'] text-[11px] leading-[14px] font-[600] text-left tracking-[0px] opacity-[1]">Me</span>
                </div>
              </div>
              <div data-type="DIVIDER" className="absolute top-[62px] left-[47px] z-[2] w-[12px] h-[0px] border-t-[2px] border-[#008FF0]/[1] rotate-[90deg] origin-left" />
              <div data-type="DIVIDER" className="absolute top-[64px] left-[43px] z-[1] w-[8px] h-[0px] border-t-[2px] border-[#008FF0]/[1] rotate-[90deg] origin-left" />
              <div data-type="DIVIDER" className="absolute top-[65px] left-[51px] z-[3] w-[6px] h-[0px] border-t-[2px] border-[#008FF0]/[1] rotate-[90deg] origin-left" />
            </div>
          </div>
          <div data-type="AVATAR" data-style="IMAGE" className="absolute top-[17px] left-[141px] z-[3] w-[34px] h-[34px] flex items-center justify-center bg-[#ced0f8]/[1] rounded-[17px] opacity-[1]">
            <div data-role="AVATAR_CONTENT" className="w-full h-full rounded-[17px] overflow-hidden">
              <img src="./assets/Puzzle/IMG_20.webp" className="w-full h-full object-cover" alt="avatar" />
            </div>
          </div>
          <div data-type="AVATAR" data-style="IMAGE" className="absolute top-[17px] left-[243px] z-[7] w-[34px] h-[34px] flex items-center justify-center bg-[#ced0f8]/[1] rounded-[17px] opacity-[1]">
            <div data-role="AVATAR_CONTENT" className="w-full h-full rounded-[17px] overflow-hidden">
              <img src="./assets/Puzzle/IMG_21.webp" className="w-full h-full object-cover" alt="avatar" />
            </div>
          </div>
          <div data-type="RECTANGLE" className="absolute top-[47px] left-[171px] z-[4] w-[8px] h-[8px] bg-[#D3ECFF]/[0.4] rounded-[9999px] opacity-[1]" />
          <div data-type="RECTANGLE" className="absolute top-[47px] left-[273px] z-[8] w-[8px] h-[8px] bg-[#D3ECFF]/[0.4] rounded-[9999px] opacity-[1]" />
          <div data-type="CONTAINER" className="w-[65px] h-[14px] absolute top-[57px] left-[125px] z-[1] bg-[#000000]/[0] opacity-[1]">
            <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit] overflow-hidden">
              <span data-type="TEXT" className="absolute top-[0px] left-[0px] z-[0] whitespace-pre text-[#F2F7FD]/[1] font-['Plus_Jakarta_Sans'] text-[11px] leading-[14px] font-[500] text-left tracking-[0px] opacity-[1]">Teammate A</span>
            </div>
          </div>
          <div data-type="CONTAINER" className="w-[65px] h-[14px] absolute top-[57px] left-[227px] z-[5] bg-[#000000]/[0] opacity-[1]">
            <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit] overflow-hidden">
              <span data-type="TEXT" className="absolute top-[0px] left-[0px] z-[0] whitespace-pre text-[#F2F7FD]/[1] font-['Plus_Jakarta_Sans'] text-[11px] leading-[14px] font-[500] text-left tracking-[0px] opacity-[1]">Teammate B</span>
            </div>
          </div>
          <div data-type="CONTAINER" className="w-[48px] h-[12px] absolute top-[73px] left-[134px] z-[2] bg-[#000000]/[0] opacity-[1]">
            <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit] overflow-hidden">
              <span data-type="TEXT" className="absolute top-[-1px] left-[-1px] z-[0] whitespace-pre text-[#A6B7CA]/[1] font-['Plus_Jakarta_Sans'] text-[9px] leading-[11px] font-[400] text-left tracking-[0px] opacity-[1]">Visual View</span>
            </div>
          </div>
          <div data-type="CONTAINER" className="w-[39px] h-[12px] absolute top-[73px] left-[240px] z-[6] bg-[#000000]/[0] opacity-[1]">
            <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit] overflow-hidden">
              <span data-type="TEXT" className="absolute top-[-1px] left-[0px] z-[0] whitespace-pre text-[#A6B7CA]/[1] font-['Plus_Jakarta_Sans'] text-[9px] leading-[11px] font-[400] text-left tracking-[0px] opacity-[1]">Text Clue</span>
            </div>
          </div>
        </div>
        <div data-role="ELEMENT_BORDER" className="absolute inset-0 z-[1] bg-transparent pointer-events-none rounded-[inherit] border-[1px] border-[#445668]/[0.4]" />
      </div>
      <button type="button" aria-label="Voice Live" onClick={() => act("Voice Live")} aria-pressed={q.voice} data-type="BUTTON" className="absolute top-[152px] left-[13px] z-[0] min-w-[228px] h-[44px] px-[12px] flex items-center justify-center gap-[8px] bg-[#008FF0]/[1] rounded-[12px] shadow-[0px_1px_3px_0px_#13202E40] opacity-[1]">
        <img alt="" className="w-[16px] h-[16px] text-[#F2F7FD]/[1]" data-icon="Lucide_mic_Outlined" src="./assets/Puzzle/IMG_22.svg" />
        <span className="whitespace-nowrap text-[12px] leading-[20px] font-[600] font-['Plus_Jakarta_Sans'] text-[#F2F7FD]/[1]">{q.voice ? "Voice Demo On" : "Voice Muted"}</span>
      </button>
      <button type="button" aria-label="AI Hint" onClick={() => act("AI Hint")} data-type="BUTTON" className="absolute top-[152px] left-[248px] z-[1] min-w-[80px] h-[44px] px-[12px] flex items-center justify-center gap-[6px] bg-[#13202E]/[1] border-[1px] border-[#445668]/[0.8] rounded-[12px] shadow-[0px_1px_3px_0px_#13202E40] opacity-[1]">
        <img alt="" className="w-[14px] h-[14px] text-[#008FF0]/[1]" data-icon="Lucide_sparkles_Outlined" src="./assets/Puzzle/IMG_17.svg" />
        <span className="whitespace-nowrap text-[11px] leading-[18px] font-[600] font-['Plus_Jakarta_Sans'] text-[#F2F7FD]/[1]"> AI Hint </span>
      </button>
    </div>
    <div data-role="ELEMENT_BORDER" className="absolute inset-0 z-[1] bg-transparent pointer-events-none rounded-[inherit] border-[1px] border-[#445668]/[0.8]" />
  </div>
  <button type="button" aria-label="SOLVE TOGETHER & UNLOCK TREASURE" onClick={() => act("SOLVE TOGETHER & UNLOCK TREASURE")} data-type="BUTTON" className="absolute top-[1475px] left-[14px] z-[2] min-w-[362px] h-[48px] px-[16px] flex items-center justify-center gap-[8px] bg-[#008FF0]/[1] rounded-[12px] shadow-[0px_6px_16px_0px_#13202E73,_0px_0px_1px_0px_#00BFD440] opacity-[1]">
    <span className="whitespace-nowrap text-[14px] leading-[22px] font-[500] font-['Plus_Jakarta_Sans'] text-[#F2F7FD]/[1]"> SOLVE TOGETHER & UNLOCK TREASURE </span>
    <img alt="" className="w-[16px] h-[16px] text-[#F2F7FD]/[1]" data-icon="Lucide_arrow-right_Outlined" src="./assets/Puzzle/IMG_23.svg" />
  </button>
  <span data-type="TEXT" className="absolute top-[1539px] left-[75px] z-[3] whitespace-pre text-[#A6B7CA]/[1] font-['JetBrains_Mono'] text-[10px] leading-[15px] font-[400] text-center tracking-[0px] opacity-[1]">ALL 3 SQUAD MEMBERS MUST AGREE TO UNLOCK</span>
</div>

    </>
  )
}

export default Puzzle
