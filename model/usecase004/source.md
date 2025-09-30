```
@startuml
left to right direction
skinparam packageStyle rectangle

actor "開発者" as Dev
actor "DevOpsエンジニア" as DevOps
actor "QAエンジニア" as QA
actor "セキュリティ監査者" as SecAuditor
actor "プロダクトオーナー" as PO

rectangle "CI/CDパイプライン管理システム" {
  
  package "ソース管理" {
    usecase "コードをプッシュ" as UC1
    usecase "プルリクエスト作成" as UC2
    usecase "コードレビュー実施" as UC3
    usecase "ブランチ戦略管理" as UC4
  }
  
  package "ビルド・テスト" {
    usecase "自動ビルド実行" as UC5
    usecase "単体テスト実行" as UC6
    usecase "統合テスト実行" as UC7
    usecase "E2Eテスト実行" as UC8
    usecase "パフォーマンステスト実行" as UC9
    usecase "テスト結果分析" as UC10
    usecase "ビルドアーティファクト管理" as UC11
  }
  
  package "品質管理" {
    usecase "静的コード解析" as UC12
    usecase "コードカバレッジ測定" as UC13
    usecase "脆弱性スキャン" as UC14
    usecase "ライセンスチェック" as UC15
    usecase "品質ゲート評価" as UC16
  }
  
  package "デプロイメント" {
    usecase "ステージング環境デプロイ" as UC17
    usecase "本番環境デプロイ" as UC18
    usecase "ロールバック実行" as UC19
    usecase "カナリアデプロイ実行" as UC20
    usecase "ブルーグリーンデプロイ" as UC21
    usecase "デプロイ承認管理" as UC22
  }
  
  package "監視・通知" {
    usecase "パイプライン状態監視" as UC23
    usecase "デプロイ履歴確認" as UC24
    usecase "失敗通知受信" as UC25
    usecase "メトリクスダッシュボード確認" as UC26
    usecase "アラート設定管理" as UC27
  }
  
  package "設定管理" {
    usecase "パイプライン設定編集" as UC28
    usecase "環境変数管理" as UC29
    usecase "シークレット管理" as UC30
    usecase "権限設定管理" as UC31
  }
}

' 外部システム
actor "GitHubWebhook" as GitHub <<system>>
actor "Slackボット" as Slack <<system>>
actor "コンテナレジストリ" as Registry <<system>>
actor "Kubernetesクラスタ" as K8s <<system>>

' 開発者の関連
Dev --> UC1
Dev --> UC2
Dev --> UC3
Dev --> UC10
Dev --> UC24
Dev --> UC25

' DevOpsエンジニアの関連
DevOps --> UC4
DevOps --> UC9
DevOps --> UC11
DevOps --> UC17
DevOps --> UC18
DevOps --> UC19
DevOps --> UC20
DevOps --> UC21
DevOps --> UC22
DevOps --> UC23
DevOps --> UC26
DevOps --> UC27
DevOps --> UC28
DevOps --> UC29
DevOps --> UC30
DevOps --> UC31

' QAエンジニアの関連
QA --> UC7
QA --> UC8
QA --> UC9
QA --> UC10
QA --> UC16
QA --> UC22

' セキュリティ監査者の関連
SecAuditor --> UC14
SecAuditor --> UC15
SecAuditor --> UC16
SecAuditor --> UC22
SecAuditor --> UC24
SecAuditor --> UC30
SecAuditor --> UC31

' プロダクトオーナーの関連
PO --> UC18
PO --> UC22
PO --> UC24
PO --> UC26

' include関係（必須の依存）
UC1 ..> UC5 : <<include>>
UC2 ..> UC3 : <<include>>
UC5 ..> UC6 : <<include>>
UC5 ..> UC12 : <<include>>
UC7 ..> UC6 : <<include>>
UC8 ..> UC7 : <<include>>
UC17 ..> UC11 : <<include>>
UC18 ..> UC11 : <<include>>
UC18 ..> UC22 : <<include>>
UC16 ..> UC13 : <<include>>
UC16 ..> UC14 : <<include>>

' extend関係（オプショナルな拡張）
UC5 <.. UC13 : <<extend>>
UC17 <.. UC9 : <<extend>>
UC18 <.. UC20 : <<extend>>
UC18 <.. UC21 : <<extend>>
UC23 <.. UC25 : <<extend>>

' 汎化関係
UC17 --|> UC18
UC20 --|> UC18
UC21 --|> UC18

' 外部システムとの関連
GitHub --> UC1
UC25 --> Slack
UC11 --> Registry
UC18 --> K8s
UC19 --> K8s

note right of UC22
  複数の承認者が必要
  ステージ環境: QA承認
  本番環境: PO + SecAuditor承認
end note

note bottom of UC16
  品質ゲート条件:
  - カバレッジ >= 80%
  - 重大な脆弱性なし
  - コードスメル < 閾値
end note

note left of UC30
  暗号化されたシークレット管理
  アクセスログ記録必須
end note

@enduml
```

```
@startuml
left to right direction
skinparam packageStyle rectangle

actor "Developer" as Dev
actor "DevOps Engineer" as DevOps
actor "QA Engineer" as QA
actor "Security Auditor" as SecAuditor
actor "Product Owner" as PO

rectangle "CI/CD Pipeline Management System" {
  
  package "Source Control" {
    usecase "Push Code" as UC1
    usecase "Create Pull Request" as UC2
    usecase "Conduct Code Review" as UC3
    usecase "Manage Branch Strategy" as UC4
  }
  
  package "Build & Test" {
    usecase "Execute Automated Build" as UC5
    usecase "Run Unit Tests" as UC6
    usecase "Run Integration Tests" as UC7
    usecase "Run E2E Tests" as UC8
    usecase "Run Performance Tests" as UC9
    usecase "Analyze Test Results" as UC10
    usecase "Manage Build Artifacts" as UC11
  }
  
  package "Quality Management" {
    usecase "Static Code Analysis" as UC12
    usecase "Measure Code Coverage" as UC13
    usecase "Scan Vulnerabilities" as UC14
    usecase "Check Licenses" as UC15
    usecase "Evaluate Quality Gates" as UC16
  }
  
  package "Deployment" {
    usecase "Deploy to Staging" as UC17
    usecase "Deploy to Production" as UC18
    usecase "Execute Rollback" as UC19
    usecase "Execute Canary Deployment" as UC20
    usecase "Execute Blue-Green Deployment" as UC21
    usecase "Manage Deployment Approval" as UC22
  }
  
  package "Monitoring & Notification" {
    usecase "Monitor Pipeline Status" as UC23
    usecase "View Deployment History" as UC24
    usecase "Receive Failure Notifications" as UC25
    usecase "View Metrics Dashboard" as UC26
    usecase "Manage Alert Settings" as UC27
  }
  
  package "Configuration Management" {
    usecase "Edit Pipeline Configuration" as UC28
    usecase "Manage Environment Variables" as UC29
    usecase "Manage Secrets" as UC30
    usecase "Manage Permission Settings" as UC31
  }
}

' External Systems
actor "GitHub Webhook" as GitHub <<s>>
actor "Slack Bot" as Slack <<s>>
actor "Container Registry" as Registry <<s>>
actor "Kubernetes Cluster" as K8s <<s>>

' Developer associations
Dev --> UC1
Dev --> UC2
Dev --> UC3
Dev --> UC10
Dev --> UC24
Dev --> UC25

' DevOps Engineer associations
DevOps --> UC4
DevOps --> UC9
DevOps --> UC11
DevOps --> UC17
DevOps --> UC18
DevOps --> UC19
DevOps --> UC20
DevOps --> UC21
DevOps --> UC22
DevOps --> UC23
DevOps --> UC26
DevOps --> UC27
DevOps --> UC28
DevOps --> UC29
DevOps --> UC30
DevOps --> UC31

' QA Engineer associations
QA --> UC7
QA --> UC8
QA --> UC9
QA --> UC10
QA --> UC16
QA --> UC22

' Security Auditor associations
SecAuditor --> UC14
SecAuditor --> UC15
SecAuditor --> UC16
SecAuditor --> UC22
SecAuditor --> UC24
SecAuditor --> UC30
SecAuditor --> UC31

' Product Owner associations
PO --> UC18
PO --> UC22
PO --> UC24
PO --> UC26

' include relationships (mandatory dependencies)
UC1 ..> UC5 : <<include>>
UC2 ..> UC3 : <<include>>
UC5 ..> UC6 : <<include>>
UC5 ..> UC12 : <<include>>
UC7 ..> UC6 : <<include>>
UC8 ..> UC7 : <<include>>
UC17 ..> UC11 : <<include>>
UC18 ..> UC11 : <<include>>
UC18 ..> UC22 : <<include>>
UC16 ..> UC13 : <<include>>
UC16 ..> UC14 : <<include>>

' extend relationships (optional extensions)
UC5 <.. UC13 : <<extend>>
UC17 <.. UC9 : <<extend>>
UC18 <.. UC20 : <<extend>>
UC18 <.. UC21 : <<extend>>
UC23 <.. UC25 : <<extend>>

' generalization relationships
UC17 --|> UC18
UC20 --|> UC18
UC21 --|> UC18

' External system associations
GitHub --> UC1
UC25 --> Slack
UC11 --> Registry
UC18 --> K8s
UC19 --> K8s

note right of UC22
  Multiple approvers required
  Staging: QA approval
  Production: PO + SecAuditor approval
end note

note bottom of UC16
  Quality gate criteria:
  - Coverage >= 80%
  - No critical vulnerabilities
  - Code smells < threshold
end note

note left of UC30
  Encrypted secret management
  Access logging required
end note

@enduml
```