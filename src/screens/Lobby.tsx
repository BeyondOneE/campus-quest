import type { ScreenProps } from "../types";
function Lobby({ q, act }: ScreenProps) {
  return (
    <>
      <div data-type="PAGE" className="relative w-[390px] h-[1131px] bg-[#13202E]/[1] overflow-y-auto overflow-x-hidden">
  <div data-type="CONTAINER" className="w-[390px] h-[128px] absolute top-[0px] left-[0px] z-[14] bg-[#1F2D3C]/[0.95] shadow-[0px_2px_8px_0px_#13202E59] backdrop-blur-[12px] opacity-[1]">
    <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
      <div data-type="CONTAINER" className="w-[390px] h-[40px] absolute top-[0px] left-[0px] z-[10] bg-[#000000]/[0] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <img alt="" data-type="IMAGE" className="absolute top-[0px] left-[0px] z-[0] w-[70px] h-[40px] opacity-[1]" src="./assets/Lobby/IMG_1.svg" />
          <img alt="" data-type="IMAGE" className="absolute top-[0px] left-[294px] z-[1] w-[96px] h-[40px] opacity-[1]" src="./assets/Lobby/IMG_2.svg" />
        </div>
      </div>
      <div data-type="CONTAINER" className="w-[32px] h-[32px] absolute top-[46px] left-[14px] z-[4] bg-[#008FF0]/[1] rounded-[16px] shadow-[0px_2px_8px_0px_#13202E59] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <img alt="" data-type="ICON" className="absolute top-[8px] left-[8px] z-[0] w-[16px] h-[16px] text-[#F2F7FD]/[1] opacity-[1]" data-icon="Lucide_compass_Outlined" src="./assets/Lobby/IMG_3.svg" />
        </div>
      </div>
      <div data-type="CONTAINER" className="w-[126px] h-[16px] absolute top-[46px] left-[54px] z-[6] bg-[#000000]/[0] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit] overflow-hidden">
          <span data-type="TEXT" className="absolute top-[0px] left-[0px] z-[0] whitespace-pre text-[#F2F7FD]/[1] font-['Plus_Jakarta_Sans'] text-[10px] leading-[16px] font-[700] text-left tracking-[0px] uppercase opacity-[1]">XJTLU AR QUEST</span>
        </div>
      </div>
      <button type="button" aria-label="Toggle sound" onClick={() => act("Lucide_volume-2_Outlined")} data-type="BUTTON" className="absolute top-[46px] left-[308px] z-[2] min-w-[32px] h-[32px] flex items-center justify-center gap-[0px] bg-[#000000]/[0] rounded-[14px] opacity-[1]">
        <img alt="" className="w-[16px] h-[16px] text-[#A6B7CA]/[1]" data-icon="Lucide_volume-2_Outlined" src="./assets/Lobby/IMG_4.svg" />
      </button>
      <button type="button" aria-label="Settings" onClick={() => act("Lucide_settings_Outlined")} data-type="BUTTON" className="absolute top-[46px] left-[344px] z-[3] min-w-[32px] h-[32px] flex items-center justify-center gap-[0px] bg-[#000000]/[0] rounded-[14px] opacity-[1]">
        <img alt="" className="w-[16px] h-[16px] text-[#A6B7CA]/[1]" data-icon="Lucide_settings_Outlined" src="./assets/Lobby/IMG_5.svg" />
      </button>
      <div data-type="CONTAINER" className="w-[59px] h-[25px] absolute top-[49px] left-[245px] z-[1] bg-[#2B3A4A]/[0.6] rounded-[14px] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <span data-type="TEXT" className="absolute top-[4px] left-[24px] z-[1] whitespace-pre text-[#A6B7CA]/[1] font-['JetBrains_Mono'] text-[11px] leading-[17px] font-[400] text-left tracking-[0px] opacity-[1]">DEMO</span>
          <img alt="" data-type="ICON" className="absolute top-[6px] left-[8px] z-[0] w-[12px] h-[12px] text-[#10B981]/[1] opacity-[1]" data-icon="Lucide_radio_Outlined" src="./assets/Lobby/IMG_6.svg" />
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
            <img alt="" className="w-[14px] h-[14px] text-[#A6B7CA]/[1]" data-icon="Lucide_copy_Outlined" src="./assets/Lobby/IMG_7.svg" />
          </button>
          <div data-type="TAG" data-style="OUTLINED" className="absolute top-[7px] left-[278px] z-[4] w-[79px] h-[20px] flex items-center justify-center gap-[4px] opacity-[1]">
            <div data-type="TAG_ITEM" className="relative w-[79px] h-[20px] flex items-center justify-center px-[8px] bg-[#10B981]/[0.1] border-[1px] border-[#10B981]/[0.3] rounded-[10px] gap-[4px] opacity-[1]">
              <span className="whitespace-nowrap text-[10px] leading-[16px] font-[700] font-['Plus_Jakarta_Sans'] text-[#059669]/[1]"> TEAM READY </span>
            </div>
          </div>
          <div data-type="CONTAINER" className="w-[53px] h-[20px] absolute top-[8px] left-[220px] z-[3] bg-[#00486D]/[1] rounded-[9999px] opacity-[1]">
            <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
              <span data-type="TEXT" className="absolute top-[2px] left-[24px] z-[1] whitespace-pre text-[#D3ECFF]/[1] font-['Plus_Jakarta_Sans'] text-[12px] leading-[16px] font-[600] text-left tracking-[0px] opacity-[1]">3/3</span>
              <img alt="" data-type="ICON" className="absolute top-[4px] left-[8px] z-[0] w-[12px] h-[12px] text-[#A6B7CA]/[1] opacity-[1]" data-icon="Lucide_users_Outlined" src="./assets/Lobby/IMG_8.svg" />
            </div>
          </div>
          <span data-type="TEXT" className="absolute top-[10px] left-[0px] z-[1] whitespace-pre text-[#A6B7CA]/[1] font-['Plus_Jakarta_Sans'] text-[11px] leading-[17px] font-[600] text-left tracking-[1px] uppercase opacity-[1]">Room</span>
        </div>
      </div>
      <div data-type="DIVIDER" className="absolute top-[128px] left-[0px] z-[0] w-[390px] h-[0px] border-t-[1px] border-[#445668]/[1]" />
    </div>
  </div>
  <div data-type="CONTAINER" className="w-[358px] h-[57px] absolute top-[142px] left-[16px] z-[0] bg-[#1F2D3C]/[1] rounded-[12px] shadow-[0px_2px_8px_0px_#13202E59] opacity-[1]">
    <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
      <span data-type="TEXT" className="absolute top-[11px] left-[49px] z-[1] whitespace-pre text-[#F2F7FD]/[1] font-['Plus_Jakarta_Sans'] text-[13px] leading-[18px] font-[700] text-left tracking-[1px] opacity-[1]">TEAM LOBBY</span>
      <div data-type="CONTAINER" className="w-[28px] h-[28px] absolute top-[14px] left-[11px] z-[0] bg-[#008FF0]/[1] rounded-[16px] shadow-[0px_1px_3px_0px_#13202E40] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <span data-type="TEXT" className="absolute top-[5px] left-[10px] z-[0] whitespace-pre text-[#F2F7FD]/[1] font-['JetBrains_Mono'] text-[12px] leading-[16px] font-[700] text-left tracking-[0px] opacity-[1]">1</span>
        </div>
      </div>
      <div data-type="CONTAINER" className="w-[114px] h-[21px] absolute top-[17px] left-[233px] z-[3] bg-[#10B981]/[0.1] rounded-[9999px] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <span data-type="TEXT" className="absolute top-[3px] left-[24px] z-[1] whitespace-pre text-[#059669]/[1] font-['Plus_Jakarta_Sans'] text-[10px] leading-[15px] font-[700] text-left tracking-[0px] opacity-[1]">SYNCHRONIZED</span>
          <img alt="" data-type="ICON" className="absolute top-[4px] left-[9px] z-[0] w-[12px] h-[12px] text-[#10B981]/[1] opacity-[1]" data-icon="Lucide_circle-check_Outlined" src="./assets/Lobby/IMG_9.svg" />
        </div>
        <div data-role="ELEMENT_BORDER" className="absolute inset-0 z-[1] bg-transparent pointer-events-none rounded-[inherit] border-[1px] border-[#10B981]/[0.4]" />
      </div>
      <span data-type="TEXT" className="absolute top-[29px] left-[49px] z-[2] whitespace-pre text-[#A6B7CA]/[1] font-['Plus_Jakarta_Sans'] text-[11px] leading-[17px] font-[400] text-left tracking-[0px] opacity-[1]">Taicang Campus Quest Phase</span>
    </div>
    <div data-role="ELEMENT_BORDER" className="absolute inset-0 z-[1] bg-transparent pointer-events-none rounded-[inherit] border-[1px] border-[#445668]/[0.8]" />
  </div>
  <div data-type="CONTAINER" className="w-[358px] h-[42px] absolute top-[214px] left-[16px] z-[1] bg-[#2B3A4A]/[0.6] rounded-[12px] opacity-[1]">
    <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
      <button type="button" aria-label="Squad Assembly" onClick={() => act("Squad Assembly")} data-type="BUTTON" className="absolute top-[5px] left-[5px] z-[0] min-w-[174px] h-[32px] flex items-center justify-center gap-[6px] bg-[#1F2D3C]/[1] rounded-[16px] shadow-[0px_2px_8px_0px_#13202E59] opacity-[1]">
        <img alt="" className="w-[14px] h-[14px] text-[#008FF0]/[1]" data-icon="Lucide_compass_Outlined" src="./assets/Lobby/IMG_3.svg" />
        <span className="whitespace-nowrap text-[12px] leading-[20px] font-[600] font-['Plus_Jakarta_Sans'] text-[#F2F7FD]/[1]"> Squad Assembly </span>
      </button>
      <button type="button" aria-label="Student Auth" onClick={() => act("Student Auth")} data-type="BUTTON" className="absolute top-[5px] left-[179px] z-[1] min-w-[174px] h-[32px] flex items-center justify-center gap-[6px] bg-[#000000]/[0] rounded-[16px] opacity-[1]">
        <img alt="" className="w-[14px] h-[14px] text-[#008FF0]/[1]" data-icon="Lucide_id-card_Outlined" src="./assets/Lobby/IMG_10.svg" />
        <span className="whitespace-nowrap text-[12px] leading-[20px] font-[600] font-['Plus_Jakarta_Sans'] text-[#A6B7CA]/[1]"> Student Auth </span>
      </button>
    </div>
    <div data-role="ELEMENT_BORDER" className="absolute inset-0 z-[1] bg-transparent pointer-events-none rounded-[inherit] border-[1px] border-[#445668]/[0.6]" />
  </div>
  <div data-type="CONTAINER" className="w-[358px] h-[191px] absolute top-[272px] left-[16px] z-[5] bg-[#1F2D3C]/[0.9] rounded-[16px] shadow-[0px_6px_16px_0px_#13202E73,_0px_0px_1px_0px_#00BFD440] opacity-[1]">
    <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
      <button type="button" aria-label="Generate room code" onClick={() => act("Lucide_refresh-cw_Outlined")} data-type="BUTTON" className="absolute top-[14px] left-[288px] z-[2] min-w-[26px] h-[26px] px-[6px] flex items-center justify-start gap-[0px] bg-[#000000]/[0] rounded-[14px] opacity-[1]">
        <img alt="" className="w-[14px] h-[14px] text-[#A6B7CA]/[1]" data-icon="Lucide_refresh-cw_Outlined" src="./assets/Lobby/IMG_11.svg" />
      </button>
      <button type="button" aria-label="Share room" onClick={() => act("Lucide_share-2_Outlined")} data-type="BUTTON" className="absolute top-[14px] left-[318px] z-[3] min-w-[26px] h-[26px] px-[6px] flex items-center justify-start gap-[0px] bg-[#000000]/[0] rounded-[14px] opacity-[1]">
        <img alt="" className="w-[14px] h-[14px] text-[#A6B7CA]/[1]" data-icon="Lucide_share-2_Outlined" src="./assets/Lobby/IMG_12.svg" />
      </button>
      <span data-type="TEXT" className="absolute top-[18px] left-[36px] z-[1] whitespace-pre text-[#F2F7FD]/[1] font-['Plus_Jakarta_Sans'] text-[13px] leading-[18px] font-[600] text-left tracking-[0px] opacity-[1]">Matchmaking Access Code</span>
      <img alt="" data-type="ICON" className="absolute top-[19px] left-[14px] z-[0] w-[16px] h-[16px] text-[#008FF0]/[1] opacity-[1]" data-icon="Lucide_key-round_Outlined" src="./assets/Lobby/IMG_13.svg" />
      <div data-type="CONTAINER" className="w-[330px] h-[73px] absolute top-[52px] left-[14px] z-[4] bg-[#2B3A4A]/[0.5] rounded-[12px] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <span data-type="TEXT" className="absolute top-[13px] left-[13px] z-[0] whitespace-pre text-[#A6B7CA]/[1] font-['Plus_Jakarta_Sans'] text-[10px] leading-[15px] font-[700] text-left tracking-[1px] uppercase opacity-[1]">Current Room Code</span>
          <button type="button" aria-label="Copy Code" onClick={() => act("Copy Code")} data-type="BUTTON" className="absolute top-[18px] left-[204px] z-[2] min-w-[112px] h-[36px] px-[12px] flex items-center justify-center gap-[6px] bg-[#1F2D3C]/[1] border-[1px] border-[#445668]/[1] rounded-[14px] shadow-[0px_1px_3px_0px_#13202E40] opacity-[1]">
            <img alt="" className="w-[14px] h-[14px] text-[#A6B7CA]/[1]" data-icon="Lucide_copy_Outlined" src="./assets/Lobby/IMG_7.svg" />
            <span className="whitespace-nowrap text-[12px] leading-[20px] font-[600] font-['Plus_Jakarta_Sans'] text-[#F2F7FD]/[1]"> Copy Code </span>
          </button>
          <span data-type="TEXT" className="absolute top-[28px] left-[13px] z-[1] whitespace-pre text-[#F2F7FD]/[1] font-['JetBrains_Mono'] text-[24px] leading-[32px] font-[800] text-left tracking-[2px] opacity-[1]">{q.room}</span>
        </div>
        <div data-role="ELEMENT_BORDER" className="absolute inset-0 z-[1] bg-transparent pointer-events-none rounded-[inherit] border-[1px] border-[#445668]/[0.8]" />
      </div>
      <div data-type="TEXTBOX" data-style="standard" className="absolute top-[141px] left-[14px] z-[5] w-[222px] h-[36px] opacity-[1]">
        <div data-role="ELEMENT_WITH_LABEL_CONTENT_WRAPPER" className="flex flex-col justify-center h-full w-full">
          <div data-role="ELEMENT_WITH_LABEL_INPUT_WRAPPER" className="relative flex items-center w-full flex-grow px-[10px] bg-[#13202E]/[1] border-[1px] border-[#445668]/[1] rounded-[14px] gap-[6px]">
            <img alt="" className="w-[14px] h-[14px] text-[#A6B7CA]/[1]" data-icon="Lucide_key-round_Outlined" src="./assets/Lobby/IMG_13.svg" />
            <input type="text" aria-label="Room code" value={q.codeInput} onChange={e => act("code", e.target.value)} maxLength={4} placeholder="ENTER 4-CHAR CODE" className="w-full flex-1 text-[#A6B7CA]/[1] text-[12px] leading-[20px] font-[400] font-['JetBrains_Mono'] text-left placeholder:text-[#A6B7CA]/[1] outline-none bg-transparent border-none" />
          </div>
        </div>
      </div>
      <button type="button" aria-label="Switch Room" onClick={() => act("Switch Room")} data-type="BUTTON" className="absolute top-[141px] left-[243px] z-[6] min-w-[101px] h-[36px] px-[12px] flex items-center justify-center gap-[0px] bg-[#00486D]/[1] rounded-[14px] opacity-[0.5]">
        <span className="whitespace-nowrap text-[12px] leading-[20px] font-[600] font-['Plus_Jakarta_Sans'] text-[#D3ECFF]/[1]"> Switch Room </span>
      </button>
    </div>
  </div>
  <img alt="" data-type="ICON" className="absolute top-[480px] left-[18px] z-[7] w-[16px] h-[16px] text-[#008FF0]/[1] opacity-[1]" data-icon="Lucide_glasses_Outlined" src="./assets/Lobby/IMG_14.svg" />
  <span data-type="TEXT" className="absolute top-[480px] left-[40px] z-[7] whitespace-pre text-[#F2F7FD]/[1] font-['Plus_Jakarta_Sans'] text-[13px] leading-[18px] font-[600] text-left tracking-[0px] opacity-[1]">Squad Operatives (3/3)</span>
  <span data-type="TEXT" className="absolute top-[480px] left-[253px] z-[9] whitespace-pre text-[#059669]/[1] font-['JetBrains_Mono'] text-[11px] leading-[17px] font-[600] text-left tracking-[0px] opacity-[1]">Demo Voice Channel</span>
  <div data-type="RECTANGLE" className="absolute top-[485px] left-[243px] z-[8] w-[6px] h-[6px] bg-[#10B981]/[1] rounded-[9999px] opacity-[1]" />
  <div data-type="CONTAINER" className="w-[114px] h-[171px] absolute top-[507px] left-[16px] z-[10] bg-[#1F2D3C]/[0.95] rounded-[16px] shadow-[0px_6px_16px_0px_#13202E73,_0px_0px_1px_0px_#00BFD440] opacity-[1]">
    <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
      <div data-type="CONTAINER" className="w-[56px] h-[18px] absolute top-[-9px] left-[29px] z-[5] bg-[#F59E0B]/[1] rounded-[9999px] shadow-[0px_1px_3px_0px_#13202E40] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <span data-type="TEXT" className="absolute top-[2px] left-[21px] z-[1] whitespace-pre text-[#451A03]/[1] font-['Plus_Jakarta_Sans'] text-[9px] leading-[14px] font-[800] text-center tracking-[0px] uppercase opacity-[1]">Lead</span>
          <img alt="" data-type="ICON" className="absolute top-[3px] left-[8px] z-[0] w-[10px] h-[10px] text-[#451A03]/[1] opacity-[1]" data-icon="Lucide_crown_Outlined" src="./assets/Lobby/IMG_15.svg" />
        </div>
      </div>
      <div data-type="CONTAINER" className="w-[56px] h-[56px] absolute top-[15px] left-[29px] z-[3] bg-[#000000]/[0] rounded-[9999px] shadow-[0px_2px_8px_0px_#13202E59] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <div data-type="IMAGE" className="absolute top-[2px] left-[2px] z-[0] w-[52px] h-[52px] rounded-[9999px] opacity-[1] overflow-hidden">
            <img alt="" src="./assets/Lobby/IMG_16.webp" className="absolute max-w-none max-h-none top-[-10px] left-[0px] w-[52px] h-[72px]" />
          </div>
        </div>
      </div>
      <div data-type="CONTAINER" className="w-[20px] h-[20px] absolute top-[55px] left-[69px] z-[4] bg-[#10B981]/[1] rounded-[9999px] shadow-[0px_1px_3px_0px_#13202E40] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <img alt="" data-type="ICON" className="absolute top-[4px] left-[4px] z-[0] w-[12px] h-[12px] text-[#F2F7FD]/[1] opacity-[1]" data-icon="Lucide_check_Outlined" src="./assets/Lobby/IMG_17.svg" />
        </div>
      </div>
      <div data-type="CONTAINER" className="w-[57px] h-[15px] absolute top-[79px] left-[28px] z-[0] bg-[#000000]/[0] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit] overflow-hidden">
          <span data-type="TEXT" className="absolute top-[0px] left-[1px] z-[0] whitespace-pre text-[#F2F7FD]/[1] font-['Plus_Jakarta_Sans'] text-[12px] leading-[15px] font-[700] text-center tracking-[0px] opacity-[1]">{q.name.toUpperCase()}</span>
        </div>
      </div>
      <span data-type="TEXT" className="absolute top-[96px] left-[33px] z-[1] whitespace-pre text-[#A6B7CA]/[1] font-['JetBrains_Mono'] text-[10px] leading-[15px] font-[400] text-center tracking-[0px] opacity-[1]">ID #8492</span>
      <div data-type="CONTAINER" className="w-[92px] h-[41px] absolute top-[119px] left-[11px] z-[2] bg-[#000000]/[0] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <div data-type="DIVIDER" className="absolute top-[0px] left-[0px] z-[0] w-[92px] h-[0px] border-t-[1px] border-[#445668]/[0.5]" />
          <div data-type="TAG" data-style="SOLID" className="absolute top-[7px] left-[25px] z-[1] w-[41px] h-[20px] flex items-center justify-center gap-[4px] opacity-[1]">
            <div data-type="TAG_ITEM" className="relative w-[41px] h-[20px] flex items-center justify-center px-[6px] bg-[#00486D]/[1] rounded-[10px] gap-[4px] opacity-[1]">
              <span className="whitespace-nowrap text-[9px] leading-[14px] font-[600] font-['Plus_Jakarta_Sans'] text-[#D3ECFF]/[1]"> Squad </span>
            </div>
          </div>
          <div data-type="CONTAINER" className="w-[28px] h-[14px] absolute top-[27px] left-[32px] z-[2] bg-[#000000]/[0] opacity-[1]">
            <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit] overflow-hidden">
              <span data-type="TEXT" className="absolute top-[0px] left-[-1px] z-[0] whitespace-pre text-[#059669]/[1] font-['Plus_Jakarta_Sans'] text-[9px] leading-[14px] font-[500] text-center tracking-[0px] opacity-[1]">Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div data-role="ELEMENT_BORDER" className="absolute inset-0 z-[1] bg-transparent pointer-events-none rounded-[inherit] border-[1px] border-[#445668]/[1]" />
  </div>
  <div data-type="CONTAINER" className="w-[114px] h-[171px] absolute top-[507px] left-[138px] z-[11] bg-[#1F2D3C]/[0.95] rounded-[16px] shadow-[0px_6px_16px_0px_#13202E73,_0px_0px_1px_0px_#00BFD440] opacity-[1]">
    <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
      <div data-type="CONTAINER" className="w-[56px] h-[56px] absolute top-[15px] left-[29px] z-[3] bg-[#000000]/[0] rounded-[9999px] shadow-[0px_2px_8px_0px_#13202E59] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <div data-type="IMAGE" className="absolute top-[2px] left-[2px] z-[0] w-[52px] h-[52px] rounded-[9999px] opacity-[1] overflow-hidden">
            <img alt="" src="./assets/Lobby/IMG_18.webp" className="absolute max-w-none max-h-none top-[0px] left-[-13px] w-[78px] h-[52px]" />
          </div>
        </div>
      </div>
      <div data-type="CONTAINER" className="w-[20px] h-[20px] absolute top-[55px] left-[69px] z-[4] bg-[#10B981]/[1] rounded-[9999px] shadow-[0px_1px_3px_0px_#13202E40] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <img alt="" data-type="ICON" className="absolute top-[4px] left-[4px] z-[0] w-[12px] h-[12px] text-[#F2F7FD]/[1] opacity-[1]" data-icon="Lucide_check_Outlined" src="./assets/Lobby/IMG_17.svg" />
        </div>
      </div>
      <div data-type="CONTAINER" className="w-[79px] h-[15px] absolute top-[79px] left-[17px] z-[0] bg-[#000000]/[0] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit] overflow-hidden">
          <span data-type="TEXT" className="absolute top-[0px] left-[1px] z-[0] whitespace-pre text-[#F2F7FD]/[1] font-['Plus_Jakarta_Sans'] text-[12px] leading-[15px] font-[700] text-center tracking-[0px] opacity-[1]">TEAMMATE A</span>
        </div>
      </div>
      <span data-type="TEXT" className="absolute top-[96px] left-[33px] z-[1] whitespace-pre text-[#A6B7CA]/[1] font-['JetBrains_Mono'] text-[10px] leading-[15px] font-[400] text-center tracking-[0px] opacity-[1]">ID #9381</span>
      <div data-type="CONTAINER" className="w-[92px] h-[41px] absolute top-[119px] left-[11px] z-[2] bg-[#000000]/[0] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <div data-type="DIVIDER" className="absolute top-[0px] left-[0px] z-[0] w-[92px] h-[0px] border-t-[1px] border-[#445668]/[0.5]" />
          <div data-type="TAG" data-style="SOLID" className="absolute top-[7px] left-[26px] z-[1] w-[38px] h-[20px] flex items-center justify-center gap-[4px] opacity-[1]">
            <div data-type="TAG_ITEM" className="relative w-[38px] h-[20px] flex items-center justify-center px-[6px] bg-[#00486D]/[1] rounded-[10px] gap-[4px] opacity-[1]">
              <span className="whitespace-nowrap text-[9px] leading-[14px] font-[600] font-['Plus_Jakarta_Sans'] text-[#D3ECFF]/[1]"> Visual </span>
            </div>
          </div>
          <div data-type="CONTAINER" className="w-[28px] h-[14px] absolute top-[27px] left-[32px] z-[2] bg-[#000000]/[0] opacity-[1]">
            <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit] overflow-hidden">
              <span data-type="TEXT" className="absolute top-[0px] left-[-1px] z-[0] whitespace-pre text-[#059669]/[1] font-['Plus_Jakarta_Sans'] text-[9px] leading-[14px] font-[500] text-center tracking-[0px] opacity-[1]">Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div data-role="ELEMENT_BORDER" className="absolute inset-0 z-[1] bg-transparent pointer-events-none rounded-[inherit] border-[1px] border-[#445668]/[1]" />
  </div>
  <div data-type="CONTAINER" className="w-[114px] h-[171px] absolute top-[507px] left-[260px] z-[12] bg-[#1F2D3C]/[0.95] rounded-[16px] shadow-[0px_6px_16px_0px_#13202E73,_0px_0px_1px_0px_#00BFD440] opacity-[1]">
    <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
      <div data-type="CONTAINER" className="w-[56px] h-[56px] absolute top-[15px] left-[29px] z-[3] bg-[#000000]/[0] rounded-[9999px] shadow-[0px_2px_8px_0px_#13202E59] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <div data-type="IMAGE" className="absolute top-[2px] left-[2px] z-[0] w-[52px] h-[52px] rounded-[9999px] opacity-[1] overflow-hidden">
            <img alt="" src="./assets/Lobby/IMG_19.webp" className="absolute max-w-none max-h-none top-[0px] left-[-13px] w-[78px] h-[52px]" />
          </div>
        </div>
      </div>
      <div data-type="CONTAINER" className="w-[20px] h-[20px] absolute top-[55px] left-[69px] z-[4] bg-[#10B981]/[1] rounded-[9999px] shadow-[0px_1px_3px_0px_#13202E40] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <img alt="" data-type="ICON" className="absolute top-[4px] left-[4px] z-[0] w-[12px] h-[12px] text-[#F2F7FD]/[1] opacity-[1]" data-icon="Lucide_check_Outlined" src="./assets/Lobby/IMG_17.svg" />
        </div>
      </div>
      <div data-type="CONTAINER" className="w-[79px] h-[15px] absolute top-[79px] left-[17px] z-[0] bg-[#000000]/[0] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit] overflow-hidden">
          <span data-type="TEXT" className="absolute top-[0px] left-[1px] z-[0] whitespace-pre text-[#F2F7FD]/[1] font-['Plus_Jakarta_Sans'] text-[12px] leading-[15px] font-[700] text-center tracking-[0px] opacity-[1]">TEAMMATE B</span>
        </div>
      </div>
      <span data-type="TEXT" className="absolute top-[96px] left-[33px] z-[1] whitespace-pre text-[#A6B7CA]/[1] font-['JetBrains_Mono'] text-[10px] leading-[15px] font-[400] text-center tracking-[0px] opacity-[1]">ID #7754</span>
      <div data-type="CONTAINER" className="w-[92px] h-[41px] absolute top-[119px] left-[11px] z-[2] bg-[#000000]/[0] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <div data-type="DIVIDER" className="absolute top-[0px] left-[0px] z-[0] w-[92px] h-[0px] border-t-[1px] border-[#445668]/[0.5]" />
          <div data-type="TAG" data-style="SOLID" className="absolute top-[7px] left-[25px] z-[1] w-[42px] h-[20px] flex items-center justify-center gap-[4px] opacity-[1]">
            <div data-type="TAG_ITEM" className="relative w-[42px] h-[20px] flex items-center justify-center px-[6px] bg-[#00486D]/[1] rounded-[10px] gap-[4px] opacity-[1]">
              <span className="whitespace-nowrap text-[9px] leading-[14px] font-[600] font-['Plus_Jakarta_Sans'] text-[#D3ECFF]/[1]"> Cipher </span>
            </div>
          </div>
          <div data-type="CONTAINER" className="w-[28px] h-[14px] absolute top-[27px] left-[32px] z-[2] bg-[#000000]/[0] opacity-[1]">
            <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit] overflow-hidden">
              <span data-type="TEXT" className="absolute top-[0px] left-[-1px] z-[0] whitespace-pre text-[#059669]/[1] font-['Plus_Jakarta_Sans'] text-[9px] leading-[14px] font-[500] text-center tracking-[0px] opacity-[1]">Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div data-role="ELEMENT_BORDER" className="absolute inset-0 z-[1] bg-transparent pointer-events-none rounded-[inherit] border-[1px] border-[#445668]/[1]" />
  </div>
  <div data-type="CONTAINER" className="w-[358px] h-[80px] absolute top-[694px] left-[16px] z-[2] bg-[#00486D]/[0.5] rounded-[12px] opacity-[1]">
    <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
      <span data-type="TEXT" className="absolute top-[13px] left-[39px] z-[1] whitespace-pre text-[#F2F7FD]/[1] font-['Plus_Jakarta_Sans'] text-[12px] leading-[16px] font-[700] text-left tracking-[0px] opacity-[1]">Quest Protocol: Taicang Campus Exploration</span>
      <img alt="" data-type="ICON" className="absolute top-[15px] left-[13px] z-[0] w-[16px] h-[16px] text-[#008FF0]/[1] opacity-[1]" data-icon="Lucide_sparkles_Outlined" src="./assets/Lobby/IMG_20.svg" />
      <span data-type="TEXT" className="absolute top-[31px] left-[39px] z-[2] w-[303px] text-[#A6B7CA]/[1] font-['Plus_Jakarta_Sans'] text-[11px] leading-[18px] font-[400] text-left tracking-[0px] opacity-[1]">Synchronize AR viewfinders, solve campus riddles in real-time, and unlock the final digital artifact.</span>
    </div>
    <div data-role="ELEMENT_BORDER" className="absolute inset-0 z-[1] bg-transparent pointer-events-none rounded-[inherit] border-[1px] border-[#445668]/[0.8]" />
  </div>
  <div role="button" tabIndex={0} aria-label="START ADVENTURE" onClick={() => act("START ADVENTURE")} onKeyDown={e => { if(e.key === "Enter" || e.key === " ") { e.preventDefault(); act("START ADVENTURE"); } } } data-type="CONTAINER" className="w-[358px] h-[48px] absolute top-[793px] left-[16px] z-[3] bg-[#008FF0]/[1] rounded-[9999px] shadow-[0px_12px_28px_0px_#13202E8c,_0px_0px_20px_0px_#008FF04d] opacity-[1]">
    <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
      <span data-type="TEXT" className="absolute top-[14px] left-[103px] z-[0] whitespace-pre text-[#F2F7FD]/[1] font-['Plus_Jakarta_Sans'] text-[14px] leading-[20px] font-[700] text-left tracking-[0px] opacity-[1]">START ADVENTURE</span>
      <img alt="" data-type="ICON" className="absolute top-[16px] left-[239px] z-[1] w-[16px] h-[16px] text-[#F2F7FD]/[1] opacity-[1]" data-icon="Lucide_arrow-right_Outlined" src="./assets/Lobby/IMG_21.svg" />
    </div>
  </div>
  <span data-type="TEXT" className="absolute top-[850px] left-[61px] z-[4] whitespace-pre text-[#A6B7CA]/[1] font-['Plus_Jakarta_Sans'] text-[10px] leading-[15px] font-[500] text-center tracking-[0px] opacity-[1]">All 3 teammates must stay within 200m spatial proximity.</span>
  <div data-type="CONTAINER" className="w-[342px] h-[210px] absolute top-[888px] left-[24px] z-[13] bg-[#1F2D3C]/[0.95] rounded-[16px] shadow-[0px_12px_28px_0px_#13202E8c,_0px_0px_20px_0px_#008FF04d] backdrop-blur-[12px] opacity-[1]">
    <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
      <div data-type="CONTAINER" className="w-[45px] h-[20px] absolute top-[13px] left-[280px] z-[2] bg-[#00486D]/[1] rounded-[9999px] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <span data-type="TEXT" className="absolute top-[2px] left-[20px] z-[1] whitespace-pre text-[#D3ECFF]/[1] font-['Plus_Jakarta_Sans'] text-[10px] leading-[15px] font-[500] text-left tracking-[0px] opacity-[1]">3/3</span>
          <img alt="" data-type="ICON" className="absolute top-[5px] left-[7px] z-[0] w-[10px] h-[10px] text-[#D3ECFF]/[1] opacity-[1]" data-icon="Lucide_users_Outlined" src="./assets/Lobby/IMG_8.svg" />
        </div>
      </div>
      <div data-type="CONTAINER" className="w-[145px] h-[16px] absolute top-[15px] left-[37px] z-[3] bg-[#000000]/[0] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit] overflow-hidden">
          <span data-type="TEXT" className="absolute top-[0px] left-[0px] z-[0] whitespace-pre text-[#F2F7FD]/[1] font-['Plus_Jakarta_Sans'] text-[12px] leading-[16px] font-[600] text-left tracking-[0px] opacity-[1]">Squad Voice • Room {q.room}</span>
        </div>
      </div>
      <img alt="" data-type="ICON" className="absolute top-[16px] left-[17px] z-[4] w-[14px] h-[14px] text-[#008FF0]/[1] opacity-[1]" data-icon="Lucide_radio_Outlined" src="./assets/Lobby/IMG_6.svg" />
      <div data-type="CONTAINER" className="w-[316px] h-[100px] absolute top-[43px] left-[13px] z-[5] bg-[#2B3A4A]/[0.4] rounded-[12px] opacity-[1]">
        <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
          <div data-type="CONTAINER" className="w-[94px] h-[82px] absolute top-[9px] left-[9px] z-[0] bg-[#13202E]/[1] rounded-[16px] shadow-[0px_1px_3px_0px_#13202E40] opacity-[1]">
            <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
              <div data-type="AVATAR" data-style="IMAGE" className="absolute top-[8px] left-[30px] z-[4] w-[34px] h-[34px] flex items-center justify-center bg-[#ced0f8]/[1] rounded-[17px] opacity-[1]">
                <div data-role="AVATAR_CONTENT" className="w-full h-full rounded-[17px] overflow-hidden">
                  <img src="./assets/Lobby/IMG_22.webp" className="w-full h-full object-cover" alt="avatar" />
                </div>
              </div>
              <div data-type="CONTAINER" className="w-[14px] h-[14px] absolute top-[30px] left-[56px] z-[5] bg-[#008FF0]/[1] rounded-[9999px] shadow-[0px_1px_3px_0px_#13202E40] opacity-[1]">
                <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
                  <img alt="" data-type="ICON" className="absolute top-[2px] left-[2px] z-[0] w-[10px] h-[10px] text-[#F2F7FD]/[1] opacity-[1]" data-icon="Lucide_volume-2_Outlined" src="./assets/Lobby/IMG_4.svg" />
                </div>
              </div>
              <div data-type="CONTAINER" className="w-[17px] h-[14px] absolute top-[48px] left-[38px] z-[0] bg-[#000000]/[0] opacity-[1]">
                <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit] overflow-hidden">
                  <span data-type="TEXT" className="absolute top-[0px] left-[0px] z-[0] whitespace-pre text-[#008FF0]/[1] font-['Plus_Jakarta_Sans'] text-[11px] leading-[14px] font-[600] text-left tracking-[0px] opacity-[1]">Me</span>
                </div>
              </div>
              <div data-type="DIVIDER" className="absolute top-[62px] left-[47px] z-[2] w-[12px] h-[0px] border-t-[2px] border-[#008FF0]/[1] rotate-[90deg] origin-left" />
              <div data-type="DIVIDER" className="absolute top-[64px] left-[43px] z-[1] w-[8px] h-[0px] border-t-[2px] border-[#008FF0]/[1] rotate-[90deg] origin-left" />
              <div data-type="DIVIDER" className="absolute top-[65px] left-[51px] z-[3] w-[6px] h-[0px] border-t-[2px] border-[#008FF0]/[1] rotate-[90deg] origin-left" />
            </div>
          </div>
          <div data-type="AVATAR" data-style="IMAGE" className="absolute top-[17px] left-[141px] z-[3] w-[34px] h-[34px] flex items-center justify-center bg-[#ced0f8]/[1] rounded-[17px] opacity-[1]">
            <div data-role="AVATAR_CONTENT" className="w-full h-full rounded-[17px] overflow-hidden">
              <img src="./assets/Lobby/IMG_23.webp" className="w-full h-full object-cover" alt="avatar" />
            </div>
          </div>
          <div data-type="AVATAR" data-style="IMAGE" className="absolute top-[17px] left-[243px] z-[7] w-[34px] h-[34px] flex items-center justify-center bg-[#ced0f8]/[1] rounded-[17px] opacity-[1]">
            <div data-role="AVATAR_CONTENT" className="w-full h-full rounded-[17px] overflow-hidden">
              <img src="./assets/Lobby/IMG_24.webp" className="w-full h-full object-cover" alt="avatar" />
            </div>
          </div>
          <div data-type="CONTAINER" className="w-[14px] h-[14px] absolute top-[43px] left-[269px] z-[8] bg-[#EE362F]/[1] rounded-[9999px] shadow-[0px_1px_3px_0px_#13202E40] opacity-[1]">
            <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit]">
              <img alt="" data-type="ICON" className="absolute top-[2px] left-[2px] z-[0] w-[10px] h-[10px] text-[#FFF4F2]/[1] opacity-[1]" data-icon="Lucide_mic-off_Outlined" src="./assets/Lobby/IMG_25.svg" />
            </div>
          </div>
          <div data-type="RECTANGLE" className="absolute top-[47px] left-[171px] z-[4] w-[8px] h-[8px] bg-[#D3ECFF]/[0.4] rounded-[9999px] opacity-[1]" />
          <div data-type="CONTAINER" className="w-[65px] h-[14px] absolute top-[57px] left-[125px] z-[1] bg-[#000000]/[0] opacity-[1]">
            <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit] overflow-hidden">
              <span data-type="TEXT" className="absolute top-[-1px] left-[0px] z-[0] whitespace-pre text-[#F2F7FD]/[1] font-['Plus_Jakarta_Sans'] text-[11px] leading-[14px] font-[500] text-left tracking-[0px] opacity-[1]">Teammate A</span>
            </div>
          </div>
          <div data-type="CONTAINER" className="w-[65px] h-[14px] absolute top-[57px] left-[227px] z-[5] bg-[#000000]/[0] opacity-[1]">
            <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit] overflow-hidden">
              <span data-type="TEXT" className="absolute top-[-1px] left-[0px] z-[0] whitespace-pre text-[#F2F7FD]/[1] font-['Plus_Jakarta_Sans'] text-[11px] leading-[14px] font-[500] text-left tracking-[0px] opacity-[1]">Teammate B</span>
            </div>
          </div>
          <div data-type="CONTAINER" className="w-[25px] h-[12px] absolute top-[73px] left-[145px] z-[2] bg-[#000000]/[0] opacity-[1]">
            <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit] overflow-hidden">
              <span data-type="TEXT" className="absolute top-[0px] left-[0px] z-[0] whitespace-pre text-[#A6B7CA]/[1] font-['Plus_Jakarta_Sans'] text-[9px] leading-[11px] font-[400] text-left tracking-[0px] opacity-[1]">Visual</span>
            </div>
          </div>
          <div data-type="CONTAINER" className="w-[29px] h-[12px] absolute top-[73px] left-[245px] z-[6] bg-[#000000]/[0] opacity-[1]">
            <div data-role="CONTAINER_CHILDREN_WRAPPER" className="relative z-[0] w-full h-full rounded-[inherit] overflow-hidden">
              <span data-type="TEXT" className="absolute top-[0px] left-[0px] z-[0] whitespace-pre text-[#A6B7CA]/[1] font-['Plus_Jakarta_Sans'] text-[9px] leading-[11px] font-[400] text-left tracking-[0px] opacity-[1]">Cipher</span>
            </div>
          </div>
        </div>
        <div data-role="ELEMENT_BORDER" className="absolute inset-0 z-[1] bg-transparent pointer-events-none rounded-[inherit] border-[1px] border-[#445668]/[0.4]" />
      </div>
      <button type="button" aria-label="Voice Live" onClick={() => act("Voice Live")} aria-pressed={q.voice} data-type="BUTTON" className="absolute top-[152px] left-[13px] z-[0] min-w-[228px] h-[44px] px-[12px] flex items-center justify-center gap-[8px] bg-[#008FF0]/[1] rounded-[12px] shadow-[0px_1px_3px_0px_#13202E40] opacity-[1]">
        <img alt="" className="w-[16px] h-[16px] text-[#F2F7FD]/[1]" data-icon="Lucide_mic_Outlined" src="./assets/Lobby/IMG_26.svg" />
        <span className="whitespace-nowrap text-[12px] leading-[20px] font-[600] font-['Plus_Jakarta_Sans'] text-[#F2F7FD]/[1]">{q.voice ? "Voice Demo On" : "Voice Muted"}</span>
      </button>
      <button type="button" aria-label="AI Hint" onClick={() => act("AI Hint")} data-type="BUTTON" className="absolute top-[152px] left-[248px] z-[1] min-w-[80px] h-[44px] px-[12px] flex items-center justify-center gap-[6px] bg-[#13202E]/[1] border-[1px] border-[#445668]/[0.8] rounded-[12px] shadow-[0px_1px_3px_0px_#13202E40] opacity-[1]">
        <img alt="" className="w-[14px] h-[14px] text-[#008FF0]/[1]" data-icon="Lucide_sparkles_Outlined" src="./assets/Lobby/IMG_20.svg" />
        <span className="whitespace-nowrap text-[11px] leading-[18px] font-[600] font-['Plus_Jakarta_Sans'] text-[#F2F7FD]/[1]"> AI Hint </span>
      </button>
    </div>
    <div data-role="ELEMENT_BORDER" className="absolute inset-0 z-[1] bg-transparent pointer-events-none rounded-[inherit] border-[1px] border-[#445668]/[0.8]" />
  </div>
</div>

    </>
  )
}

export default Lobby
