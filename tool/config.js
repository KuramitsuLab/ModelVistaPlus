// AWS API Gateway設定
const AWS_CONFIG = {
    // S3保存を有効化
    enabled: true,

    // ステップ4で取得したAPI GatewayのエンドポイントURL
    // TODO: 以下のURLを実際のAPI GatewayエンドポイントURLに置き換えてください
    apiEndpoint: 'https://8ceej22hvk.execute-api.ap-northeast-1.amazonaws.com/prod/upload',

    // API認証キー（APIキーを使用しない場合は空文字列）
    apiKey: ''
};

// 設定をグローバルに公開
window.AWS_CONFIG = AWS_CONFIG;
