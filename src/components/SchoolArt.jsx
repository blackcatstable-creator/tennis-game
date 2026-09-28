import { useId } from 'react';

// ============================================================
// SchoolArt — 中学選択画面用のミニイラスト（画像素材なし、SVGのみ）。
// 各校のアーキタイプを「校舎のシルエット＋窓の配色＋屋根の形＋エンブレム」で描き分ける。
// ============================================================

function Windows({ x, y, cols, rows, cw, ch, gap, lit, dim, palette }) {
  const cells = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const idx = r * cols + c;
      const fill = palette ? palette[idx % palette.length] : (idx % 3 === 0 ? dim : lit);
      cells.push(
        <rect key={`${r}-${c}`} x={x + c * (cw + gap)} y={y + r * (ch + gap)} width={cw} height={ch} rx="1" fill={fill} />,
      );
    }
  }
  return <>{cells}</>;
}

// x,y は「校舎の接地点（地面ラインの中央下端）」を表す。壁は y から上へ height 分、
// 屋根はさらにその上に roofH 分、それぞれ積み上がる。windows は元々 y=接地点 を基準に
// 描かれているため、group ごと -height だけ上へ平行移動して壁の位置に合わせる。
function Building({
  x, y, width, height, wall, wallShade, roof, roofStyle = 'peak', windows,
}) {
  const top = y - height;
  const roofH = roofStyle === 'castle' ? 24 : roofStyle === 'flat' ? 8 : roofStyle === 'small' ? 12 : 18;
  return (
    <g>
      <rect x={x + width - 9} y={top} width={9} height={height} fill={wallShade} />
      <rect x={x} y={top} width={width} height={height} fill={wall} />
      {roofStyle === 'peak' && <polygon points={`${x - 6},${top} ${x + width / 2},${top - roofH} ${x + width + 6},${top}`} fill={roof} />}
      {roofStyle === 'small' && <polygon points={`${x - 3},${top} ${x + width / 2},${top - roofH} ${x + width + 3},${top}`} fill={roof} />}
      {roofStyle === 'flat' && <rect x={x - 4} y={top - roofH} width={width + 8} height={roofH} fill={roof} />}
      {roofStyle === 'castle' && (
        <g>
          <rect x={x - 4} y={top - roofH} width={width + 8} height={roofH} fill={roof} />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={x - 4 + i * ((width + 8) / 5)} y={top - roofH - 7} width={9} height={7} fill={roof} />
          ))}
        </g>
      )}
      <g transform={`translate(0, ${-height})`}>{windows}</g>
      <rect x={x + width / 2 - 6} y={y - 16} width={12} height={16} fill={wallShade} />
    </g>
  );
}

function Scene({ skyTop, skyBottom, glow, ground, groundLine, children, gid }) {
  return (
    <svg viewBox="0 0 260 140" className="school-art" preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id={`sky-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skyTop} />
          <stop offset="100%" stopColor={skyBottom} />
        </linearGradient>
        <radialGradient id={`glow-${gid}`} cx="50%" cy="15%" r="60%">
          <stop offset="0%" stopColor={glow} stopOpacity="0.55" />
          <stop offset="100%" stopColor={glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="260" height="140" fill={`url(#sky-${gid})`} />
      <rect x="0" y="0" width="260" height="140" fill={`url(#glow-${gid})`} />
      {children}
      <rect x="0" y="120" width="260" height="20" fill={ground} />
      <rect x="0" y="119" width="260" height="2" fill={groundLine} />
    </svg>
  );
}

// ---- 陽泉中学校：バランス型。中庸な緑と金、左右対称の校舎 ----
function YosenArt() {
  const gid = useId();
  return (
    <Scene gid={gid} skyTop="#123b28" skyBottom="#0a1f16" glow="#4fb87a" ground="#0c231a" groundLine="#1f5236">
      <Building
        x={85} y={120} width={90} height={62} wall="#1f5236" wallShade="#163d27" roof="#d99a2b" roofStyle="peak"
        windows={<Windows x={94} y={130} cols={4} rows={2} cw={10} ch={9} gap={4} lit="#f0e0a8" dim="#3a6b4a" />}
      />
      <g transform="translate(130,20)">
        <circle r="9" fill="#0f281b" stroke="#d99a2b" strokeWidth="1.5" />
        <path d="M-4.5,0 L4.5,0 M0,-4.5 L0,4.5" stroke="#f0c96a" strokeWidth="1.6" strokeLinecap="round" />
      </g>
    </Scene>
  );
}

// ---- 氷華学園中等部：大所帯・絶対王者。幅広で豪奢な城のような校舎 ----
function HyokaArt() {
  const gid = useId();
  return (
    <Scene gid={gid} skyTop="#3a1414" skyBottom="#0a1f16" glow="#f0b74a" ground="#1a0e0e" groundLine="#5a2020">
      <Building
        x={40} y={120} width={180} height={78} wall="#6b1f1f" wallShade="#4a1414" roof="#f0b74a" roofStyle="castle"
        windows={<Windows x={54} y={126} cols={7} rows={3} cw={10} ch={9} gap={5} lit="#ffe6a3" dim="#8a3a3a" />}
      />
      <g transform="translate(130,68)">
        <circle r="13" fill="#4a1414" stroke="#f0b74a" strokeWidth="1.2" />
        <path d="M-7,5 L-7,-1 L-3.5,3 L0,-5 L3.5,3 L7,-1 L7,5 Z" fill="#f0b74a" />
      </g>
    </Scene>
  );
}

// ---- 四季ヶ丘中学校：個性豊か。窓ひとつひとつが違う色 ----
function ShikigaokaArt() {
  const gid = useId();
  const palette = ['#e0785a', '#5ac8e0', '#e0c85a', '#8ad67a', '#c77dd6', '#f0b74a', '#5a9bd8', '#e05a8a'];
  return (
    <Scene gid={gid} skyTop="#2a1f3c" skyBottom="#0a1f16" glow="#c77dd6" ground="#160f22" groundLine="#3a2c5c">
      <Building
        x={78} y={120} width={104} height={64} wall="#33405c" wallShade="#242e42" roof="#8a5fd6" roofStyle="peak"
        windows={<Windows x={88} y={128} cols={4} rows={2} cw={11} ch={10} gap={5} palette={palette} />}
      />
      <g transform="translate(130,18)">
        <path d="M0,-9 L2.6,-2.7 L9,-2.7 L3.7,1.3 L5.9,7.6 L0,3.7 L-5.9,7.6 L-3.7,1.3 L-9,-2.7 L-2.6,-2.7 Z" fill="#f0c96a" />
      </g>
    </Scene>
  );
}

// ---- 不知火中学校：闘志・粘り。燃えるような色合いと旗 ----
function ShiranuiArt() {
  const gid = useId();
  return (
    <Scene gid={gid} skyTop="#3a1c0f" skyBottom="#0a1f16" glow="#e0522b" ground="#1e0f08" groundLine="#5a2a1a">
      <Building
        x={95} y={120} width={70} height={58} wall="#5a2a1a" wallShade="#3d1c11" roof="#c9432b" roofStyle="small"
        windows={<Windows x={102} y={128} cols={3} rows={2} cw={10} ch={9} gap={4} lit="#ffcf8a" dim="#8a4a2a" />}
      />
      <g transform="translate(130,46)">
        <line x1="0" y1="0" x2="0" y2="20" stroke="#8a4a2a" strokeWidth="2" />
        <path d="M0,0 L18,4 L0,9 Z" fill="#e0522b" />
      </g>
    </Scene>
  );
}

// ---- 山彦中学校：データ・叩き上げ。グリッド模様とルーペ ----
function YamabikoArt() {
  const gid = useId();
  return (
    <Scene gid={gid} skyTop="#132638" skyBottom="#0a1f16" glow="#4fb8b0" ground="#0c1c26" groundLine="#24384a">
      <Building
        x={82} y={120} width={96} height={60} wall="#24384a" wallShade="#182634" roof="#4fb8b0" roofStyle="flat"
        windows={<Windows x={90} y={128} cols={5} rows={2} cw={8} ch={9} gap={4.5} lit="#a8e0da" dim="#33566e" />}
      />
      <g transform="translate(150,32)">
        <circle cx="0" cy="0" r="7" fill="none" stroke="#4fb8b0" strokeWidth="2" />
        <line x1="5" y1="5" x2="11" y2="11" stroke="#4fb8b0" strokeWidth="2.2" strokeLinecap="round" />
      </g>
    </Scene>
  );
}

// ---- 琉海中学校：自由奔放。波と非対称な屋根 ----
function RyukaiArt() {
  const gid = useId();
  return (
    <Scene gid={gid} skyTop="#123232" skyBottom="#0a1f16" glow="#59c1c9" ground="#0c211f" groundLine="#2c4a4a">
      <g transform="skewX(-3)">
        <Building
          x={84} y={120} width={92} height={56} wall="#2c4a4a" wallShade="#1c3232" roof="#59c1c9" roofStyle="peak"
          windows={<Windows x={92} y={128} cols={4} rows={2} cw={10} ch={9} gap={4} lit="#c8f0ee" dim="#3d6b6b" />}
        />
      </g>
      <path d="M10,124 Q35,116 60,124 T110,124 T160,124 T210,124 T260,124" fill="none" stroke="#59c1c9" strokeWidth="2" opacity="0.6" />
    </Scene>
  );
}

// ---- 六甲中学校：守備型・のんびり。低く幅広く、盾のエンブレム ----
function RokkoArt() {
  const gid = useId();
  return (
    <Scene gid={gid} skyTop="#122c22" skyBottom="#0a1f16" glow="#6b8f6b" ground="#0e2018" groundLine="#2f4a3a">
      <Building
        x={55} y={120} width={150} height={44} wall="#2f4a3a" wallShade="#20342a" roof="#6b8f6b" roofStyle="flat"
        windows={<Windows x={64} y={126} cols={7} rows={1} cw={10} ch={10} gap={5} lit="#cfe6cf" dim="#42604c" />}
      />
      <g transform="translate(130,36)">
        <path d="M0,-10 L9,-6 L9,3 Q9,12 0,16 Q-9,12 -9,3 L-9,-6 Z" fill="#6b8f6b" stroke="#1a3d28" strokeWidth="1" />
      </g>
    </Scene>
  );
}

// ---- 聖蘭中学校：理論派。本の積み重ねと幾何学的な窓 ----
function SeiranArt() {
  const gid = useId();
  return (
    <Scene gid={gid} skyTop="#161c30" skyBottom="#0a1f16" glow="#7a8bb0" ground="#0d1220" groundLine="#263049">
      <Building
        x={86} y={120} width={88} height={64} wall="#263049" wallShade="#1a2032" roof="#7a8bb0" roofStyle="peak"
        windows={<Windows x={94} y={128} cols={4} rows={2} cw={9} ch={9} gap={4.5} lit="#d8dff0" dim="#3a4562" />}
      />
      <g transform="translate(50,110)">
        <rect x="-14" y="0" width="28" height="5" fill="#7a8bb0" />
        <rect x="-11" y="-5" width="22" height="5" fill="#a8b6d8" />
        <rect x="-8" y="-10" width="16" height="5" fill="#7a8bb0" />
      </g>
    </Scene>
  );
}

// ---- 天覇中学校（隠し校）：少数精鋭。小さく引き締まった校舎、金の縁取り ----
function TenpaArt() {
  const gid = useId();
  return (
    <Scene gid={gid} skyTop="#1c1508" skyBottom="#0a1f16" glow="#f0c96a" ground="#100c04" groundLine="#7a5a13">
      <Building
        x={105} y={120} width={50} height={64} wall="#1a1a1a" wallShade="#0e0e0e" roof="#f0c96a" roofStyle="small"
        windows={<Windows x={112} y={128} cols={2} rows={2} cw={9} ch={9} gap={5} lit="#ffe6a3" dim="#4a3a10" />}
      />
      <rect x="103" y="56" width="54" height="3" fill="#f0c96a" />
      <g transform="translate(130,26)">
        <path d="M0,-8 L2.3,-2.4 L8,-2.4 L3.3,1.2 L5.3,6.8 L0,3.3 L-5.3,6.8 L-3.3,1.2 L-8,-2.4 L-2.3,-2.4 Z" fill="#f0c96a" />
      </g>
    </Scene>
  );
}

// ---- 神無月中学校（隠し校）：伝説の無敗校。壮大な城郭と月桂冠 ----
function KannazukiArt() {
  const gid = useId();
  return (
    <Scene gid={gid} skyTop="#241a3c" skyBottom="#0a1f16" glow="#f0c96a" ground="#150f22" groundLine="#6a3f8f">
      <Building
        x={30} y={120} width={200} height={86} wall="#3a2a5c" wallShade="#281c40" roof="#f0c96a" roofStyle="castle"
        windows={<Windows x={44} y={126} cols={8} rows={3} cw={9} ch={9} gap={5} lit="#ffe6a3" dim="#5a4680" />}
      />
      <g transform="translate(130,72)">
        <circle r="15" fill="#281c40" stroke="#f0c96a" strokeWidth="1.2" />
        <path d="M-8,5 Q-8,-4 -3,-6 Q0,-9 3,-6 Q8,-4 8,5" fill="none" stroke="#f0c96a" strokeWidth="1.6" />
        <path d="M0,-9 L1.9,-4.6 L6.5,-4.6 L2.9,-1.9 L4.3,2.6 L0,-0.2 L-4.3,2.6 L-2.9,-1.9 L-6.5,-4.6 L-1.9,-4.6 Z" fill="#f0c96a" />
      </g>
    </Scene>
  );
}

const SCHOOL_ART = {
  yosen: YosenArt,
  hyoka: HyokaArt,
  shikigaoka: ShikigaokaArt,
  shiranui: ShiranuiArt,
  yamabiko: YamabikoArt,
  ryukai: RyukaiArt,
  rokko: RokkoArt,
  seiran: SeiranArt,
  tenpa: TenpaArt,
  kannazuki: KannazukiArt,
};

export default function SchoolArt({ schoolId }) {
  const Art = SCHOOL_ART[schoolId] || YosenArt;
  return <Art />;
}
