/**
 * GitHub連携モジュール
 * ローカルファイルとGitHub Pagesからのデータ取得をサポート
 */

const GitHubClient = {
    // GitHub Pages URL (リポジトリをGitHub Pagesで公開している場合)
    // 例: https://username.github.io/ModelVistaPlus/
    githubPagesBaseUrl: window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/'),

    /**
     * 問題セットからデータを取得
     * @param {string} problemSet - 問題セット名 (例: 'class001')
     * @returns {Promise<Object>} - 問題データとメタデータ
     */
    async loadProblemSet(problemSet) {
        try {
            // ローカルファイルパスを使用 (../model/から読み込む)
            const basePath = `../model/${problemSet}`;

            // qa_new_ja2.json が存在するか確認し、なければ qa_new_ja.json を使用
            let questionsData;
            let qaFile = `${basePath}/qa_new_ja2.json`;

            try {
                questionsData = await this.fetchJSON(qaFile);
                console.log(`${problemSet}: qa_new_ja2.json を読み込みました`);
            } catch (error) {
                console.log(`qa_new_ja2.json が見つかりません。qa_new_ja.json を試します...`);
                qaFile = `${basePath}/qa_new_ja.json`;
                questionsData = await this.fetchJSON(qaFile);
                console.log(`${problemSet}: qa_new_ja.json を読み込みました`);
            }

            // image.json を取得
            const imageData = await this.fetchJSON(`${basePath}/image.json`);

            return {
                questions: questionsData,
                imageInfo: imageData,
                imagePath: `${basePath}/dgpowerpoint_ja-fs8.png`,
                problemSet: problemSet
            };
        } catch (error) {
            console.error('問題セットの読み込みに失敗:', error);
            throw new Error(`問題セット ${problemSet} の読み込みに失敗しました: ${error.message}`);
        }
    },

    /**
     * JSONファイルを取得
     * @param {string} path - ファイルパス
     * @returns {Promise<Object>} - JSONデータ
     */
    async fetchJSON(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`JSONファイルの取得に失敗: ${path}`, error);
            throw error;
        }
    },

    /**
     * 画像の存在を確認
     * @param {string} imagePath - 画像パス
     * @returns {Promise<boolean>} - 画像が存在するか
     */
    async checkImageExists(imagePath) {
        try {
            const response = await fetch(imagePath, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            console.error('画像の確認に失敗:', error);
            return false;
        }
    },

    /**
     * カスタムURLから問題セットを取得 (GitHub API使用)
     * @param {string} url - GitHub URL
     * @returns {Promise<Object>} - 問題データとメタデータ
     */
    async loadFromCustomUrl(url) {
        try {
            // GitHub URLをAPI URLに変換
            const apiUrl = this.convertToApiUrl(url);

            // ディレクトリの内容を取得
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const files = await response.json();

            // qa_new_ja2.json または qa_new_ja.json と image.json を探す
            let qaFile = files.find(f => f.name === 'qa_new_ja2.json');
            if (!qaFile) {
                qaFile = files.find(f => f.name === 'qa_new_ja.json');
            }
            const imageFile = files.find(f => f.name === 'image.json');
            const pngFile = files.find(f => f.name.endsWith('.png') && f.name.includes('powerpoint'));

            if (!qaFile || !imageFile || !pngFile) {
                throw new Error('必要なファイルが見つかりません');
            }

            // ファイルの内容を取得
            const [questionsData, imageData] = await Promise.all([
                this.fetchGitHubFile(qaFile.download_url),
                this.fetchGitHubFile(imageFile.download_url)
            ]);

            return {
                questions: questionsData,
                imageInfo: imageData,
                imagePath: pngFile.download_url,
                problemSet: 'custom'
            };
        } catch (error) {
            console.error('カスタムURLからの読み込みに失敗:', error);
            throw new Error(`カスタムURLからの読み込みに失敗しました: ${error.message}`);
        }
    },

    /**
     * GitHub URLをAPI URLに変換
     * @param {string} url - GitHub URL
     * @returns {string} - API URL
     */
    convertToApiUrl(url) {
        // https://github.com/user/repo/tree/branch/path を
        // https://api.github.com/repos/user/repo/contents/path?ref=branch に変換
        const regex = /github\.com\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)\/(.+)/;
        const match = url.match(regex);

        if (match) {
            const [, user, repo, branch, path] = match;
            return `https://api.github.com/repos/${user}/${repo}/contents/${path}?ref=${branch}`;
        }

        throw new Error('無効なGitHub URLです');
    },

    /**
     * GitHub APIからファイルを取得
     * @param {string} url - ダウンロードURL
     * @returns {Promise<Object>} - JSONデータ
     */
    async fetchGitHubFile(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('GitHubファイルの取得に失敗:', error);
            throw error;
        }
    }
};

// グローバルに公開
window.GitHubClient = GitHubClient;
