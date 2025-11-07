// AWS API Gateway設定
const AWS_CONFIG = {
    // S3保存を有効化
    enabled: false,

    // ステップ4で取得したAPI GatewayのエンドポイントURL
    // 例: https://abcd1234.execute-api.ap-northeast-1.amazonaws.com/prod/upload
    apiEndpoint: '',

    // API認証キー（セキュリティ対策）
    apiKey: ''
};

// 設定をグローバルに公開
window.AWS_CONFIG = AWS_CONFIG;
