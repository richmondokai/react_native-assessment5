import React, { Component } from 'react';
import { WebView } from 'react-native-webview';
import { Keyboard, Platform, StyleSheet, TextInput, View, Dimensions } from 'react-native';

const PlatformIOS = Platform.OS === 'ios';

const createHTML = (options = {}) => {
  const {
    backgroundColor = '#FFFFFF',
    color = '#000000',
    placeholderColor = '#999999',
    contentCSSText = '',
    initialFocus = false,
    useContainer = true,
    initialHeight = 200,
    caretColor = '#007AFF'
  } = options;

  return {
    html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        * {
            outline: 0px solid transparent;
            -webkit-tap-highlight-color: rgba(0,0,0,0);
            -webkit-touch-callout: none;
            box-sizing: border-box;
        }
        
        html, body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            font-size: 16px;
            padding: 0;
            margin: 0;
            background-color: ${backgroundColor};
            color: ${color};
            caret-color: ${caretColor};
            ${contentCSSText}
        }
        
        body {
            overflow-y: hidden;
            -webkit-overflow-scrolling: touch;
            height: auto;
            min-height: ${initialHeight}px;
            padding: 16px;
        }
        
        #editor {
            min-height: ${initialHeight - 32}px;
            height: auto;
            outline: none;
            border: none;
            font-size: 16px;
            line-height: 1.5;
            word-wrap: break-word;
        }
        
        #editor:empty:before {
            content: attr(placeholder);
            color: ${placeholderColor};
            font-style: italic;
        }
        
        h1, h2, h3, h4, h5, h6 {
            margin: 16px 0 8px 0;
            font-weight: bold;
        }
        
        h1 { font-size: 24px; }
        h2 { font-size: 20px; }
        h3 { font-size: 18px; }
        
        p {
            margin: 8px 0;
        }
        
        ul, ol {
            margin: 8px 0;
            padding-left: 20px;
        }
        
        li {
            margin: 4px 0;
        }
        
        strong, b {
            font-weight: bold;
        }
        
        em, i {
            font-style: italic;
        }
        
        u {
            text-decoration: underline;
        }
        
        a {
            color: ${caretColor};
            text-decoration: underline;
        }
        
        blockquote {
            border-left: 3px solid ${caretColor};
            padding-left: 12px;
            margin: 8px 0;
            color: ${placeholderColor};
            font-style: italic;
        }
        
        pre, code {
            background-color: #f5f5f5;
            border-radius: 4px;
            padding: 2px 4px;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 14px;
        }
        
        pre {
            padding: 12px;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <div id="editor" contenteditable="true" placeholder="Start typing..."></div>
    
    <script>
        const editor = document.getElementById('editor');
        let isAndroid = /Android/i.test(navigator.userAgent);
        
        // Message passing
        const postMessage = (type, data) => {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type, data }));
        };
        
        // Content change handler
        let contentTimeout;
        const handleContentChange = () => {
            clearTimeout(contentTimeout);
            contentTimeout = setTimeout(() => {
                const html = editor.innerHTML;
                const text = editor.innerText || editor.textContent || '';
                postMessage('CONTENT_CHANGE', { html, text });
                updateHeight();
            }, 300);
        };
        
        // Height management
        const updateHeight = () => {
            const height = Math.max(document.body.scrollHeight, ${initialHeight});
            postMessage('HEIGHT_CHANGE', height);
        };
        
        // Focus/Blur handlers
        editor.addEventListener('focus', () => {
            postMessage('EDITOR_FOCUS', true);
        });
        
        editor.addEventListener('blur', () => {
            postMessage('EDITOR_BLUR', false);
        });
        
        // Content change listeners
        editor.addEventListener('input', handleContentChange);
        editor.addEventListener('paste', (e) => {
            // Clean paste content
            setTimeout(handleContentChange, 100);
        });
        
        // Selection change
        document.addEventListener('selectionchange', () => {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                postMessage('SELECTION_CHANGE', {
                    text: selection.toString(),
                    start: range.startOffset,
                    end: range.endOffset
                });
            }
        });
        
        // Command execution
        const execCommand = (command, value = null) => {
            document.execCommand(command, false, value);
            handleContentChange();
        };
        
        // Message handler from React Native
        window.addEventListener('message', (event) => {
            const message = JSON.parse(event.data);
            const { type, command, value, html, placeholder } = message;
            
            switch (type) {
                case 'SET_HTML':
                    console.log('🌐 WebView received SET_HTML:', html?.substring(0, 100) + (html?.length > 100 ? '...' : ''));
                    console.log('🌐 HTML length:', (html || '').length);
                    console.log('🌐 Editor element found:', !!editor);
                    
                    if (editor) {
                        // Clear first, then set content
                        editor.innerHTML = '';
                        
                        if (html && html.trim().length > 0) {
                            // If it's plain text, wrap in paragraph
                            if (!html.includes('<') || html === html.replace(/<[^>]*>/g, '')) {
                                console.log('🌐 Setting plain text content, wrapping in paragraph');
                                editor.innerHTML = '<p>' + html + '</p>';
                            } else {
                                console.log('🌐 Setting HTML content directly');
                                editor.innerHTML = html;
                            }
                        } else {
                            console.log('🌐 Content is empty, clearing editor');
                            editor.innerHTML = '';
                        }
                        
                        console.log('🌐 Editor content after setting:', editor.innerHTML?.substring(0, 100));
                        console.log('🌐 Editor text content:', editor.textContent?.substring(0, 100));
                        updateHeight();
                    }
                    
                    // Notify that content was set
                    postMessage('HTML_SET', { 
                        success: true, 
                        length: (html || '').length,
                        actualContent: editor ? editor.innerHTML : 'editor not found'
                    });
                    break;
                    
                case 'GET_HTML':
                    postMessage('HTML_RESPONSE', editor.innerHTML);
                    break;
                    
                case 'SET_PLACEHOLDER':
                    editor.setAttribute('placeholder', placeholder || 'Start typing...');
                    break;
                    
                case 'EXEC_COMMAND':
                    execCommand(command, value);
                    break;
                    
                case 'FOCUS':
                    editor.focus();
                    break;
                    
                case 'BLUR':
                    editor.blur();
                    break;
                    
                case 'INSERT_HTML':
                    document.execCommand('insertHTML', false, value);
                    handleContentChange();
                    break;
                    
                case 'INSERT_TEXT':
                    document.execCommand('insertText', false, value);
                    handleContentChange();
                    break;
            }
        });
        
        // Initialize
        ${initialFocus ? 'editor.focus();' : ''}
        updateHeight();
        
        // Debug editor state
        console.log('🌐 Editor initialized:', {
            editorFound: !!editor,
            editorId: editor ? editor.id : 'none',
            editorContent: editor ? editor.innerHTML : 'none',
            isContentEditable: editor ? editor.contentEditable : 'none'
        });
        
        postMessage('EDITOR_READY', {
            ready: true,
            editorFound: !!editor,
            isContentEditable: editor ? editor.contentEditable : false
        });
    </script>
</body>
</html>
    `
  };
};

export default class WebViewRichTextEditor extends Component {
  static defaultProps = {
    style: {},
    placeholder: 'Start typing...',
    initialContentHTML: '',
    initialFocus: false,
    disabled: false,
    useContainer: true,
    initialHeight: 200,
    backgroundColor: '#FFFFFF',
    color: '#000000',
    placeholderColor: '#999999',
    caretColor: '#007AFF',
    onReady: null,
  };

  constructor(props) {
    super(props);
    this.state = {
      html: createHTML(props),
      height: props.initialHeight,
      keyboardHeight: 0,
    };
    
    this.webViewRef = React.createRef();
    this.unmount = false;
    this._focus = false;
    this._keyOpen = false;
    this._editorReady = false;
    this._pendingContent = null;
    this._lastSetContent = null;
    this._userIsTyping = false;
    
    this.onMessage = this.onMessage.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this._onKeyboardWillShow = this._onKeyboardWillShow.bind(this);
    this._onKeyboardWillHide = this._onKeyboardWillHide.bind(this);
  }

  componentDidMount() {
    this.unmount = false;
    
    if (PlatformIOS) {
      this.keyboardEventListeners = [
        Keyboard.addListener('keyboardWillShow', this._onKeyboardWillShow),
        Keyboard.addListener('keyboardWillHide', this._onKeyboardWillHide),
      ];
    } else {
      this.keyboardEventListeners = [
        Keyboard.addListener('keyboardDidShow', this._onKeyboardWillShow),
        Keyboard.addListener('keyboardDidHide', this._onKeyboardWillHide),
      ];
    }
  }

  componentDidUpdate(prevProps) {
    const { initialContentHTML } = this.props;
    
    // Handle content updates when props change
    if (prevProps.initialContentHTML !== initialContentHTML) {
      console.log('📝 WebView editor props updated:', {
        prevContent: prevProps.initialContentHTML?.substring(0, 50) + (prevProps.initialContentHTML?.length > 50 ? '...' : ''),
        newContent: initialContentHTML?.substring(0, 50) + (initialContentHTML?.length > 50 ? '...' : ''),
        prevLength: prevProps.initialContentHTML?.length || 0,
        newLength: initialContentHTML?.length || 0
      });
      
      if (initialContentHTML !== undefined) {
        // Delay to ensure WebView is ready
        setTimeout(() => {
          console.log('📝 Updating WebView content via componentDidUpdate');
          this.setContentHTML(initialContentHTML);
        }, 150);
      }
    }
  }

  componentWillUnmount() {
    this.unmount = true;
    this.keyboardEventListeners?.forEach(eventListener => eventListener.remove());
    
    // Clear typing timeout
    if (this._typingTimeout) {
      clearTimeout(this._typingTimeout);
    }
  }

  _onKeyboardWillShow(event) {
    this._keyOpen = true;
    const keyboardHeight = event.endCoordinates.height;
    this.setState({ keyboardHeight });
  }

  _onKeyboardWillHide(event) {
    this._keyOpen = false;
    this.setState({ keyboardHeight: 0 });
  }

  onMessage(event) {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      const { type, data } = message;
      
      switch (type) {
        case 'CONTENT_CHANGE':
          console.log('📝 WebView content change received:', data.html?.substring(0, 100) + (data.html?.length > 100 ? '...' : ''));
          console.log('📝 Plain text length:', data.text?.length || 0);
          console.log('📝 HTML length:', data.html?.length || 0);
          
          // Mark that user is actively typing
          this._userIsTyping = true;
          
          // Clear typing flag after a delay
          clearTimeout(this._typingTimeout);
          this._typingTimeout = setTimeout(() => {
            this._userIsTyping = false;
          }, 1000);
          
          this.props.onChangeText?.(data.html);
          this.props.onChange?.(data);
          break;
          
        case 'HEIGHT_CHANGE':
          if (this.props.useContainer && data !== this.state.height) {
            this.setState({ height: Math.max(data, this.props.initialHeight) });
          }
          this.props.onHeightChange?.(data);
          break;
          
        case 'EDITOR_FOCUS':
          this._focus = true;
          this.props.onFocus?.();
          break;
          
        case 'EDITOR_BLUR':
          this._focus = false;
          this.props.onBlur?.();
          break;
          
        case 'SELECTION_CHANGE':
          this.props.onSelectionChange?.(data);
          break;
          
        case 'HTML_RESPONSE':
          if (this.htmlPromiseResolve) {
            this.htmlPromiseResolve(data);
            this.htmlPromiseResolve = null;
          }
          break;
          
        case 'HTML_SET':
          console.log('📝 WebView confirmed HTML was set:', {
            success: data.success,
            originalLength: data.length,
            actualContent: data.actualContent?.substring(0, 100) + (data.actualContent?.length > 100 ? '...' : ''),
            actualContentLength: data.actualContent?.length || 0
          });
          break;
          
        case 'EDITOR_READY':
          console.log('📝 WebView editor ready:', data);
          this._editorReady = true;
          this.initializeEditor();
          
          // If there's pending content, set it now
          if (this._pendingContent !== null) {
            console.log('📝 Setting pending content after editor ready:', this._pendingContent?.substring(0, 50));
            setTimeout(() => {
              this.setContentHTML(this._pendingContent);
              this._pendingContent = null;
            }, 100);
          }
          
          // Call onReady callback if provided
          if (this.props.onReady) {
            console.log('📝 Calling onReady callback');
            this.props.onReady();
          }
          break;
          
        default:
          this.props.onMessage?.(message);
          break;
      }
    } catch (e) {
      console.warn('WebViewRichTextEditor: Failed to parse message', e);
    }
  }

  sendMessage(type, data = {}) {
    if (!this.unmount && this.webViewRef.current) {
      const message = typeof data === 'object' ? { type, ...data } : { type, value: data };
      this.webViewRef.current.postMessage(JSON.stringify(message));
    }
  }

  initializeEditor() {
    const { initialContentHTML, placeholder, disabled } = this.props;
    
    console.log('📝 Initializing WebView editor with:', {
      hasInitialContent: !!initialContentHTML,
      contentLength: initialContentHTML?.length || 0,
      contentPreview: initialContentHTML?.substring(0, 100) + (initialContentHTML?.length > 100 ? '...' : ''),
      placeholder: placeholder,
      disabled: disabled
    });
    
    if (initialContentHTML) {
      // Set initial content once during initialization
      console.log('📝 Setting initial content during initialization');
      this.setContentHTML(initialContentHTML);
    }
    
    if (placeholder) {
      this.setPlaceholder(placeholder);
    }
    
    if (disabled) {
      this.setDisabled(disabled);
    }
    
    this.props.onReady?.();
  }

  // Public API methods
  setContentHTML(html) {
    console.log('📝 Setting WebView content HTML:', {
      hasContent: !!html,
      contentLength: html?.length || 0,
      contentPreview: html?.substring(0, 100) + (html?.length > 100 ? '...' : ''),
      isHTML: html?.includes('<') && html?.includes('>'),
      editorReady: this._editorReady
    });
    
    if (!this._editorReady) {
      console.log('📝 Editor not ready, queuing content for later');
      this._pendingContent = html;
      return;
    }
    
    // Don't set content if it's the same as what's already there
    if (this._lastSetContent === html) {
      console.log('📝 Content already set, skipping duplicate');
      return;
    }
    
    // Don't set content if user is actively typing
    if (this._userIsTyping) {
      console.log('📝 User is typing, deferring content setting');
      // Queue this content for later
      this._pendingContent = html;
      return;
    }
    
    // Send the message and verify it was received
    this.sendMessage('SET_HTML', { html });
    this._lastSetContent = html;
    
    // Add a verification mechanism - retry if content doesn't appear
    setTimeout(() => {
      this.verifyContent(html);
    }, 500);
  }

  // Verify that content was actually set
  async verifyContent(expectedHtml) {
    try {
      const actualHtml = await this.getContentHTML();
      const expectedText = expectedHtml.replace(/<[^>]*>/g, '').trim();
      const actualText = actualHtml.replace(/<[^>]*>/g, '').trim();
      
      console.log('📝 Content verification:', {
        expectedText: expectedText.substring(0, 50),
        actualText: actualText.substring(0, 50),
        matches: expectedText === actualText
      });
      
      if (expectedText !== actualText && expectedText.length > 0) {
        console.log('📝 Content mismatch detected, retrying...');
        // Retry setting the content
        setTimeout(() => {
          this.sendMessage('SET_HTML', { html: expectedHtml });
        }, 200);
      }
    } catch (error) {
      console.log('📝 Content verification failed:', error);
    }
  }

  getContentHTML() {
    return new Promise((resolve) => {
      this.htmlPromiseResolve = resolve;
      this.sendMessage('GET_HTML');
    });
  }

  setPlaceholder(placeholder) {
    this.sendMessage('SET_PLACEHOLDER', { placeholder });
  }

  setDisabled(disabled) {
    this.sendMessage('EXEC_COMMAND', { 
      command: 'contentEditable', 
      value: disabled ? 'false' : 'true' 
    });
  }

  focus() {
    this.showAndroidKeyboard();
    this.sendMessage('FOCUS');
  }

  blur() {
    this.sendMessage('BLUR');
  }

  showAndroidKeyboard() {
    if (Platform.OS === 'android' && !this._keyOpen && this._input) {
      this._input.focus();
    }
  }

  // Formatting commands
  setBold() {
    this.sendMessage('EXEC_COMMAND', { command: 'bold' });
  }

  setItalic() {
    this.sendMessage('EXEC_COMMAND', { command: 'italic' });
  }

  setUnderline() {
    this.sendMessage('EXEC_COMMAND', { command: 'underline' });
  }

  insertBulletsList() {
    this.sendMessage('EXEC_COMMAND', { command: 'insertUnorderedList' });
  }

  insertOrderedList() {
    this.sendMessage('EXEC_COMMAND', { command: 'insertOrderedList' });
  }

  setHeading(level) {
    this.sendMessage('EXEC_COMMAND', { command: 'formatBlock', value: `h${level}` });
  }

  insertLink(url, title = 'Link') {
    this.sendMessage('INSERT_HTML', { value: `<a href="${url}">${title}</a>` });
  }

  insertHTML(html) {
    this.sendMessage('INSERT_HTML', { value: html });
  }

  insertText(text) {
    this.sendMessage('INSERT_TEXT', { value: text });
  }

  render() {
    const { height, keyboardHeight } = this.state;
    const { useContainer, style, backgroundColor } = this.props;
    
    const webViewContent = (
      <>
        <WebView
          ref={this.webViewRef}
          style={[styles.webview, { backgroundColor }]}
          source={this.state.html}
          onMessage={this.onMessage}
          javaScriptEnabled={true}
          domStorageEnabled={false}
          scrollEnabled={false}
          bounces={false}
          useWebKit={true}
          hideKeyboardAccessoryView={true}
          keyboardDisplayRequiresUserAction={false}
          onShouldStartLoadWithRequest={() => true}
        />
        {Platform.OS === 'android' && (
          <TextInput
            ref={ref => (this._input = ref)}
            style={styles.hiddenInput}
          />
        )}
      </>
    );

    return useContainer ? (
      <View style={[style, { height }]}>
        {webViewContent}
      </View>
    ) : (
      webViewContent
    );
  }
}

const styles = StyleSheet.create({
  webview: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    left: -999,
    top: -999,
  },
});
