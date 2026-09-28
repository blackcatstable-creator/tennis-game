export default function GraduationScreen({ onProcess }) {
  return (
    <div className="card">
      <h2>卒部の時</h2>
      <p>3年生は夏大会をもって引退となった。関東大会に出場した選手のデータは保存され、次の世代の育成（第2部）に引き継がれる。</p>
      <div className="action-footer">
        <button className="primary" onClick={onProcess}>卒部処理を行う</button>
      </div>
    </div>
  );
}
