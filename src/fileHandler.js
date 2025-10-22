// fileHandler.js - ファイル読み込み処理

/**
 * JSONファイルを読み込む
 * @param {File} file - Fileオブジェクト
 * @returns {Promise<Array>} 問題配列
 */
async function loadJsonFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);

                // スキーマ検証
                if (!Array.isArray(json)) {
                    throw new Error('JSONファイルは配列形式である必要があります');
                }

                // 各問題のスキーマ検証
                json.forEach((q, index) => {
                    if (!q.tag || !q.question || !q.choice || !Array.isArray(q.choice)) {
                        throw new Error(`問題${index + 1}のスキーマが不正です`);
                    }
                    if (q.choice.length !== 4) {
                        throw new Error(`問題${index + 1}の選択肢は4つ必要です`);
                    }
                });

                resolve(json);
            } catch (error) {
                reject(new Error(`JSONファイルの読み込みに失敗しました: ${error.message}`));
            }
        };

        reader.onerror = () => {
            reject(new Error('ファイルの読み込みに失敗しました'));
        };

        reader.readAsText(file);
    });
}

/**
 * 画像ファイルを読み込む（Data URL形式）
 * @param {File} file - Fileオブジェクト
 * @returns {Promise<string>} Data URL
 */
async function loadImageFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            resolve(e.target.result);
        };

        reader.onerror = () => {
            reject(new Error('画像ファイルの読み込みに失敗しました'));
        };

        reader.readAsDataURL(file);
    });
}

/**
 * 相対パスから画像を読み込む
 * @param {string} folderName - フォルダ名（例: activity001）
 * @param {string} imageName - 画像ファイル名（例: dgpowerpoint_ja-fs8.png）
 * @returns {Promise<string>} 画像パス
 */
async function loadImageByPath(folderName, imageName) {
    return new Promise((resolve, reject) => {
        // 相対パスを構築（srcディレクトリからの相対パス）
        const imagePath = `../model/${folderName}/${imageName}`;

        // 画像の存在確認
        const img = new Image();

        img.onload = () => {
            resolve(imagePath);
        };

        img.onerror = () => {
            reject(new Error(`画像が見つかりません: ${imagePath}`));
        };

        img.src = imagePath;
    });
}

/**
 * フォルダ一覧を取得（手動入力用のサジェスト）
 * model/ディレクトリ直下のフォルダ名を想定
 */
function getDefaultFolderList() {
    // 実際のフォルダ一覧は動的に取得できないため、
    // よくあるフォルダ名のリストを返す
    return [
        'activity001', 'activity002', 'activity003',
        'class001', 'class002', 'class003',
        'communication001', 'communication002', 'communication003',
        'component001', 'component002', 'component003',
        'composite_structure001', 'composite_structure002', 'composite_structure003',
        'database001', 'database002',
        'deployment001', 'deployment002', 'deployment003',
        'interaction_overview001', 'interaction_overview002', 'interaction_overview003',
        'mockup001', 'mockup002', 'mockup003',
        'object001', 'object002', 'object003',
        'others001', 'others002', 'others003', 'others004', 'others005',
        'others006', 'others007', 'others008', 'others009',
        'package001', 'package002', 'package003',
        'screen_flow_diagram001', 'screen_flow_diagram002', 'screen_flow_diagram003',
        'sequence001', 'sequence002', 'sequence003',
        'statemachine001', 'statemachine002', 'statemachine003', 'statemachine004', 'statemachine005',
        'sysconf001', 'sysconf002', 'sysconf003',
        'table001', 'table002', 'table003', 'table004', 'table005', 'table006',
        'timing001', 'timing002', 'timing003',
        'usecase001', 'usecase002', 'usecase003', 'usecase004'
    ];
}

/**
 * JSONファイル名のバリデーション
 * @param {string} fileName - ファイル名
 * @returns {boolean} 有効かどうか
 */
function isValidJsonFileName(fileName) {
    const validNames = ['qa_new_ja.json', 'qa_new_ja2.json'];
    return validNames.includes(fileName);
}

/**
 * ファイルの内容をエクスポート用に整形
 * @param {string} content - JSON文字列
 * @param {string} fileName - ファイル名
 * @returns {Blob} Blobオブジェクト
 */
function createJsonBlob(content, fileName) {
    const blob = new Blob([content], { type: 'application/json' });
    return blob;
}

/**
 * File System Access APIがサポートされているかチェック
 * @returns {boolean}
 */
function isFileSystemAccessSupported() {
    return 'showDirectoryPicker' in window;
}

/**
 * フォルダを選択してディレクトリハンドルを取得
 * @returns {Promise<FileSystemDirectoryHandle>}
 */
async function selectFolder() {
    if (!isFileSystemAccessSupported()) {
        throw new Error('このブラウザはFile System Access APIをサポートしていません。Chrome、Edge、またはOperaをお使いください。');
    }

    try {
        const dirHandle = await window.showDirectoryPicker({
            mode: 'read'
        });
        return dirHandle;
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('フォルダの選択がキャンセルされました');
        }
        throw error;
    }
}

/**
 * ディレクトリ内からJSONファイルを検索
 * @param {FileSystemDirectoryHandle} dirHandle
 * @returns {Promise<{file: File, fileName: string}>}
 */
async function findJsonFile(dirHandle) {
    const validJsonNames = ['qa_new_ja.json', 'qa_new_ja2.json'];

    for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file' && validJsonNames.includes(entry.name)) {
            const fileHandle = await dirHandle.getFileHandle(entry.name);
            const file = await fileHandle.getFile();
            return { file, fileName: entry.name };
        }
    }

    throw new Error(`JSONファイルが見つかりません。${validJsonNames.join(' または ')} が必要です。`);
}

/**
 * ディレクトリ内から画像ファイルを検索
 * @param {FileSystemDirectoryHandle} dirHandle
 * @returns {Promise<{file: File, fileName: string} | null>}
 */
async function findImageFile(dirHandle) {
    const targetImageName = 'dgpowerpoint_ja-fs8.png';

    try {
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file' && entry.name === targetImageName) {
                const fileHandle = await dirHandle.getFileHandle(entry.name);
                const file = await fileHandle.getFile();
                return { file, fileName: entry.name };
            }
        }

        console.warn(`画像ファイル ${targetImageName} が見つかりませんでした`);
        return null;
    } catch (error) {
        console.error('画像ファイルの検索エラー:', error);
        return null;
    }
}

/**
 * Fileオブジェクトから画像のData URLを生成
 * @param {File} file
 * @returns {Promise<string>}
 */
async function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
        reader.readAsDataURL(file);
    });
}

/**
 * ディレクトリ内からapprovedファイルを検索
 * @param {FileSystemDirectoryHandle} dirHandle
 * @returns {Promise<{file: File, fileName: string} | null>}
 */
async function findApprovedFile(dirHandle) {
    const approvedFileName = 'qa_new_ja_approved.json';

    try {
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file' && entry.name === approvedFileName) {
                const fileHandle = await dirHandle.getFileHandle(entry.name);
                const file = await fileHandle.getFile();
                return { file, fileName: entry.name };
            }
        }

        return null;
    } catch (error) {
        console.error('approvedファイルの検索エラー:', error);
        return null;
    }
}
