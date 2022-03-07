class AsciiMathParser {
    constructor() {
        this.decimalsign = '\\.';

        this.setup_symbols();
        this.sort_symbols();
    }

    setup_symbols() {
        this.greek_letters = ['alpha', 'beta', 'gamma', 'Gamma', 'delta', 'Delta', 'epsilon', 'varepsilon', 'zeta', 'eta', 'theta', 'Theta', 'vartheta', 'iota', 'kappa', 'lambda', 'Lambda', 'mu', 'nu', 'xi', 'Xi', 'pi', 'Pi', 'rho', 'sigma', 'Sigma', 'tau', 'upsilon', 'phi', 'Phi', 'varphi', 'chi', 'psi', 'Psi', 'omega', 'Omega'];

        this.relations = [
            {"asciimath":":=","tex":":="},
            {"asciimath":":|:","tex":"\\|"},
            {"asciimath":"=>","tex":"\\Rightarrow"},
            {"asciimath":"approx","tex":"\\approx"},
            {"asciimath":"~~","tex":"\\approx"},
            {"asciimath":"cong","tex":"\\cong"},
            {"asciimath":"~=","tex":"\\cong"},
            {"asciimath":"equiv","tex":"\\equiv"},
            {"asciimath":"-=","tex":"\\equiv"},
            {"asciimath":"exists","tex":"\\exists"},
            {"asciimath":"EE","tex":"\\exists"},
            {"asciimath":"forall","tex":"\\forall"},
            {"asciimath":"AA","tex":"\\forall"},
            {"asciimath":">=","tex":"\\ge"},
            {"asciimath":"ge","tex":"\\ge"},
            {"asciimath":"gt=","tex":"\\geq"},
            {"asciimath":"geq","tex":"\\geq"},
            {"asciimath":"gt","tex":"\\gt"},
            {"asciimath":"in","tex":"\\in"},
            {"asciimath":"<=","tex":"\\le"},
            {"asciimath":"le","tex":"\\le"},
            {"asciimath":"lt=","tex":"\\leq"},
            {"asciimath":"leq","tex":"\\leq"},
            {"asciimath":"lt","tex":"\\lt"},
            {"asciimath":"models","tex":"\\models"},
            {"asciimath":"|==","tex":"\\models"},
            {"asciimath":"!=","tex":"\\ne"},
            {"asciimath":"ne","tex":"\\ne"},
            {"asciimath":"notin","tex":"\\notin"},
            {"asciimath":"!in","tex":"\\notin"},
            {"asciimath":"prec","tex":"\\prec"},
            {"asciimath":"-lt","tex":"\\prec"},
            {"asciimath":"-<","tex":"\\prec"},
            {"asciimath":"preceq","tex":"\\preceq"},
            {"asciimath":"-<=","tex":"\\preceq"},
            {"asciimath":"propto","tex":"\\propto"},
            {"asciimath":"prop","tex":"\\propto"},
            {"asciimath":"subset","tex":"\\subset"},
            {"asciimath":"sub","tex":"\\subset"},
            {"asciimath":"subseteq","tex":"\\subseteq"},
            {"asciimath":"sube","tex":"\\subseteq"},
            {"asciimath":"succ","tex":"\\succ"},
            {"asciimath":">-","tex":"\\succ"},
            {"asciimath":"succeq","tex":"\\succeq"},
            {"asciimath":">-=","tex":"\\succeq"},
            {"asciimath":"supset","tex":"\\supset"},
            {"asciimath":"sup","tex":"\\supset"},
            {"asciimath":"supseteq","tex":"\\supseteq"},
            {"asciimath":"supe","tex":"\\supseteq"},
            {"asciimath":"vdash","tex":"\\vdash"},
            {"asciimath":"|--","tex":"\\vdash"},
        ]

        this.constants = [
            {"asciimath":"dt","tex":"dt"},
            {"asciimath":"dx","tex":"dx"},
            {"asciimath":"dy","tex":"dy"},
            {"asciimath":"dz","tex":"dz"},
            {"asciimath":"prime","tex":"'"},
            {"asciimath":"implies","tex":"\\implies"},
            {"asciimath":"epsi","tex":"\\epsilon"},
            {"asciimath":"leftrightarrow","tex":"\\leftrightarrow"},
            {"asciimath":"Leftrightarrow","tex":"\\Leftrightarrow"},
            {"asciimath":"rightarrow","tex":"\\rightarrow"},
            {"asciimath":"Rightarrow","tex":"\\Rightarrow"},
            {"asciimath":"backslash","tex":"\\backslash"},
            {"asciimath":"leftarrow","tex":"\\leftarrow"},
            {"asciimath":"Leftarrow","tex":"\\Leftarrow"},
            {"asciimath":"setminus","tex":"\\setminus"},
            {"asciimath":"bigwedge","tex":"\\bigwedge"},
            {"asciimath":"diamond","tex":"\\diamond"},
            {"asciimath":"bowtie","tex":"\\bowtie"},
            {"asciimath":"bigvee","tex":"\\bigvee"},
            {"asciimath":"bigcap","tex":"\\bigcap"},
            {"asciimath":"bigcup","tex":"\\bigcup"},
            {"asciimath":"square","tex":"\\square"},
            {"asciimath":"lamda","tex":"\\lambda"},
            {"asciimath":"Lamda","tex":"\\Lambda"},
            {"asciimath":"aleph","tex":"\\aleph"},
            {"asciimath":"angle","tex":"\\angle"},
            {"asciimath":"frown","tex":"\\frown"},
            {"asciimath":"qquad","tex":"\\qquad"},
            {"asciimath":"cdots","tex":"\\cdots"},
            {"asciimath":"vdots","tex":"\\vdots"},
            {"asciimath":"ddots","tex":"\\ddots"},
            {"asciimath":"cdot","tex":"\\cdot"},
            {"asciimath":"star","tex":"\\star"},
            {"asciimath":"|><|","tex":"\\bowtie"},
            {"asciimath":"circ","tex":"\\circ"},
            {"asciimath":"oint","tex":"\\oint"},
            {"asciimath":"grad","tex":"\\nabla"},
            {"asciimath":"quad","tex":"\\quad"},
            {"asciimath":"uarr","tex":"\\uparrow"},
            {"asciimath":"darr","tex":"\\downarrow"},
            {"asciimath":"downarrow","tex":"\\downarrow"},
            {"asciimath":"rarr","tex":"\\rightarrow"},
            {"asciimath":">->>","tex":"\\twoheadrightarrowtail"},
            {"asciimath":"larr","tex":"\\leftarrow"},
            {"asciimath":"harr","tex":"\\leftrightarrow"},
            {"asciimath":"rArr","tex":"\\Rightarrow"},
            {"asciimath":"lArr","tex":"\\Leftarrow"},
            {"asciimath":"hArr","tex":"\\Leftrightarrow"},
            {"asciimath":"ast","tex":"\\ast"},
            {"asciimath":"***","tex":"\\star"},
            {"asciimath":"|><","tex":"\\ltimes"},
            {"asciimath":"><|","tex":"\\rtimes"},
            {"asciimath":"^^^","tex":"\\bigwedge"},
            {"asciimath":"vvv","tex":"\\bigvee"},
            {"asciimath":"cap","tex":"\\cap"},
            {"asciimath":"nnn","tex":"\\bigcap"},
            {"asciimath":"cup","tex":"\\cup"},
            {"asciimath":"uuu","tex":"\\bigcup"},
            {"asciimath":"not","tex":"\\neg"},
            {"asciimath":"<=>","tex":"\\Leftrightarrow"},
            {"asciimath":"_|_","tex":"\\bot"},
            {"asciimath":"bot","tex":"\\bot"},
            {"asciimath":"int","tex":"\\int"},
            {"asciimath":"del","tex":"\\partial"},
            {"asciimath":"...","tex":"\\ldots"},
            {"asciimath":"/_\\","tex":"\\triangle"},
            {"asciimath":"|__","tex":"\\lfloor"},
            {"asciimath":"__|","tex":"\\rfloor"},
            {"asciimath":"dim","tex":"\\dim"},
            {"asciimath":"mod","tex":"\\operatorname{mod}"},
            {"asciimath":"lub","tex":"\\operatorname{lub}"},
            {"asciimath":"glb","tex":"\\operatorname{glb}"},
            {"asciimath":">->","tex":"\\rightarrowtail"},
            {"asciimath":"->>","tex":"\\twoheadrightarrow"},
            {"asciimath":"|->","tex":"\\mapsto"},
            {"asciimath":"lim","tex":"\\lim"},
            {"asciimath":"Lim","tex":"\\operatorname{Lim}"},
            {"asciimath":"and","tex":"\\quad\\text{and}\\quad"},
            {"asciimath":"**","tex":"\\ast"},
            {"asciimath":"//","tex":"/"},
            {"asciimath":"\\","tex":"\\,"},
            {"asciimath":"\\\\","tex":"\\backslash"},
            {"asciimath":"xx","tex":"\\times"},
            {"asciimath":"-:","tex":"\\div"},
            {"asciimath":"o+","tex":"\\oplus"},
            {"asciimath":"ox","tex":"\\otimes"},
            {"asciimath":"o.","tex":"\\odot"},
            {"asciimath":"^","tex":"\\hat{}"},
            {"asciimath":"_","tex":"\\_"},
            {"asciimath":"^^","tex":"\\wedge"},
            {"asciimath":"vv","tex":"\\vee"},
            {"asciimath":"nn","tex":"\\cap"},
            {"asciimath":"uu","tex":"\\cup"},
            {"asciimath":"TT","tex":"\\top"},
            {"asciimath":"+-","tex":"\\pm"},
            {"asciimath":"O/","tex":"\\emptyset"},
            {"asciimath":"oo","tex":"\\infty"},
            {"asciimath":":.","tex":"\\therefore"},
            {"asciimath":":'","tex":"\\because"},
            {"asciimath":"/_","tex":"\\angle"},
            {"asciimath":"|~","tex":"\\lceil"},
            {"asciimath":"~|","tex":"\\rceil"},
            {"asciimath":"CC","tex":"\\mathbb{C}"},
            {"asciimath":"NN","tex":"\\mathbb{N}"},
            {"asciimath":"QQ","tex":"\\mathbb{Q}"},
            {"asciimath":"RR","tex":"\\mathbb{R}"},
            {"asciimath":"ZZ","tex":"\\mathbb{Z}"},
            {"asciimath":"->","tex":"\\to"},
            {"asciimath":"or","tex":"\\quad\\text{or}\\quad"},
            {"asciimath":"if","tex":"\\quad\\text{if}\\quad"},
            {"asciimath":"iff", "tex":"\\iff"},
            {"asciimath":"*","tex":"\\cdot"},
            {"asciimath":"@","tex":"\\circ"},
            {"asciimath":"%","tex":"\\%"},
            {"asciimath":"boxempty","tex":"\\square"},
            {"asciimath":"lambda","tex":"\\lambda"},
            {"asciimath":"Lambda","tex":"\\Lambda"},
            {"asciimath":"nabla","tex":"\\nabla"},
            {"asciimath":"uparrow","tex":"\\uparrow"},
            {"asciimath":"downarrow","tex":"\\downarrow"},
            {"asciimath":"twoheadrightarrowtail","tex":"\\twoheadrightarrowtail"},
            {"asciimath":"ltimes","tex":"\\ltimes"},
            {"asciimath":"rtimes","tex":"\\rtimes"},
            {"asciimath":"neg","tex":"\\neg"},
            {"asciimath":"partial","tex":"\\partial"},
            {"asciimath":"ldots","tex":"\\ldots"},
            {"asciimath":"triangle","tex":"\\triangle"},
            {"asciimath":"lfloor","tex":"\\lfloor"},
            {"asciimath":"rfloor","tex":"\\rfloor"},
            {"asciimath":"rightarrowtail","tex":"\\rightarrowtail"},
            {"asciimath":"twoheadrightarrow","tex":"\\twoheadrightarrow"},
            {"asciimath":"mapsto","tex":"\\mapsto"},
            {"asciimath":"times","tex":"\\times"},
            {"asciimath":"div","tex":"\\div"},
            {"asciimath":"divide","tex":"\\div"},
            {"asciimath":"oplus","tex":"\\oplus"},
            {"asciimath":"otimes","tex":"\\otimes"},
            {"asciimath":"odot","tex":"\\odot"},
            {"asciimath":"wedge","tex":"\\wedge"},
            {"asciimath":"vee","tex":"\\vee"},
            {"asciimath":"top","tex":"\\top"},
            {"asciimath":"pm","tex":"\\pm"},
            {"asciimath":"emptyset","tex":"\\emptyset"},
            {"asciimath":"infty","tex":"\\infty"},
            {"asciimath":"therefore","tex":"\\therefore"},
            {"asciimath":"because","tex":"\\because"},
            {"asciimath":"lceil","tex":"\\lceil"},
            {"asciimath":"rceil","tex":"\\rceil"},
            {"asciimath":"to","tex":"\\to"},
            {"asciimath":"langle","tex":"\\langle"},
            {"asciimath":"lceiling","tex":"\\lceil"},
            {"asciimath":"rceiling","tex":"\\rceil"},
            {"asciimath":"max","tex":"\\max"},
            {"asciimath":"min","tex":"\\min"},
            {"asciimath":"prod","tex":"\\prod"},
            {"asciimath":"sum","tex":"\\sum"},
        ];
        this.constants = this.constants.concat(this.relations);
        
        this.left_brackets = [
            {asciimath: 'langle', tex: '\\langle'},
            {asciimath: '(:', tex: '\\langle'},
            {asciimath: '<<', tex: '\\langle'},
            {asciimath: '{:', tex: '.'},
            {asciimath: '(', tex: '('},
            {asciimath: '[', tex: '['},
            {asciimath: '{', tex: '\\lbrace'},
            {asciimath: 'lbrace', tex: '\\lbrace'},
        ];
        this.right_brackets = [
            {asciimath: 'rangle', tex: '\\rangle'},
            {asciimath: ':)', tex: '\\rangle'},
            {asciimath: '>>', tex: '\\rangle'},
            {asciimath: ':}', tex: '.', free_tex: ':\\}'},
            {asciimath: ')', tex: ')'},
            {asciimath: ']', tex: ']'},
            {asciimath: '}', tex: '\\rbrace'},
            {asciimath: 'rbrace', tex: '\\rbrace'},
        ];
        this.leftright_brackets = [
            {asciimath: '|', left_tex: '\\lvert', right_tex: '\\rvert', free_tex: '|'},
        ];
        
        this.unary_symbols = [
            {asciimath: "sqrt", tex: "\\sqrt"},
            {asciimath: "f", tex:"f", func:true},
            {asciimath: "g", tex:"g", func:true},
            {asciimath: "sin", tex:"\\sin", func:true},
            {asciimath: "cos", tex:"\\cos", func:true},
            {asciimath: "tan", tex:"\\tan", func:true},
            {asciimath: "arcsin", tex:"\\arcsin", func:true},
            {asciimath: "arccos", tex:"\\arccos", func:true},
            {asciimath: "arctan", tex:"\\arctan", func:true},
            {asciimath: "sinh", tex:"\\sinh", func:true},
            {asciimath: "cosh", tex:"\\cosh", func:true},
            {asciimath: "tanh", tex:"\\tanh", func:true},
            {asciimath: "cot", tex:"\\cot", func:true},
            {asciimath: "coth", tex:"\\coth", func:true},
            {asciimath: "sech", tex:"\\operatorname{sech}", func:true},
            {asciimath: "csch", tex:"\\operatorname{csch}", func:true},
            {asciimath: "sec", tex:"\\sec", func:true},
            {asciimath: "csc", tex:"\\csc", func:true},
            {asciimath: "log", tex:"\\log", func:true},
            {asciimath: "ln", tex:"\\ln", func:true},
            {asciimath: "abs", rewriteleftright:["|","|"]},
            {asciimath: "norm", rewriteleftright:["\\|","\\|"]},
            {asciimath: "floor", rewriteleftright:["\\lfloor","\\rfloor"]},
            {asciimath: "ceil", rewriteleftright:["\\lceil","\\rceil"]},
            {asciimath: "Sin", tex:"\\Sin", func:true},
            {asciimath: "Cos", tex:"\\Cos", func:true},
            {asciimath: "Tan", tex:"\\Tan", func:true},
            {asciimath: "Arcsin", tex:"\\Arcsin", func:true},
            {asciimath: "Arccos", tex:"\\Arccos", func:true},
            {asciimath: "Arctan", tex:"\\Arctan", func:true},
            {asciimath: "Sinh", tex:"\\Sinh", func:true},
            {asciimath: "Cosh", tex:"\\Cosh", func:true},
            {asciimath: "Tanh", tex:"\\Tanh", func:true},
            {asciimath: "Cot", tex:"\\Cot", func:true},
            {asciimath: "Sec", tex:"\\Sec", func:true},
            {asciimath: "Csc", tex:"\\Csc", func:true},
            {asciimath: "Log", tex:"\\Log", func:true},
            {asciimath: "Ln", tex:"\\Ln", func:true},
            {asciimath: "Abs", tex:"\\Abs", rewriteleftright:["|","|"]},
            {asciimath: "det", tex:"\\det", func:true},
            {asciimath: "exp", tex:"\\exp", func:true},
            {asciimath: "gcd", tex:"\\gcd", func:true},
            {asciimath:"lcm", tex:"\\operatorname{lcm}", func:true},
            {asciimath: "cancel", tex:"\\cancel"},
            {asciimath: "Sqrt", tex:"\\Sqrt"},
            {asciimath: "hat", tex:"\\hat", acc:true},
            {asciimath:"bar", tex:"\\overline", acc:true},
            {asciimath:"overline", tex:"\\overline", acc:true},
            {asciimath: "vec", tex:"\\vec", acc:true},
            {asciimath: "tilde", tex:"\\tilde", acc:true},
            {asciimath: "dot", tex:"\\dot", acc:true},
            {asciimath: "ddot", tex:"\\ddot", acc:true},
            {asciimath:"ul", tex:"\\underline", acc:true},
            {asciimath:"underline", tex:"\\underline", acc:true},
            {asciimath:"ubrace", tex:"\\underbrace", acc:true},
            {asciimath:"underbrace", tex:"\\underbrace", acc:true},
            {asciimath:"obrace", tex:"\\overbrace", acc:true},
            {asciimath:"overbrace", tex:"\\overbrace", acc:true},
            {asciimath:"bb", atname:"mathvariant", atval:"bold", tex:"\\mathbf"},
            {asciimath: "mathbf", atname:"mathvariant", atval:"bold", tex:"mathbf"},
            {asciimath:"sf", atname:"mathvariant", atval:"sans-serif", tex:"\\mathsf"},
            {asciimath: "mathsf", atname:"mathvariant", atval:"sans-serif", tex:"mathsf"},
            {asciimath:"bbb", atname:"mathvariant", atval:"double-struck", tex:"\\mathbb"},
            {asciimath: "mathbb", atname:"mathvariant", atval:"double-struck", tex:"\\mathbb"},
            {asciimath:"cc", atname:"mathvariant", atval:"script", tex:"\\mathcal"},
            {asciimath: "mathcal", atname:"mathvariant", atval:"script", tex:"\\mathcal"},
            {asciimath:"tt", atname:"mathvariant", atval:"monospace", tex:"\\mathtt"},
            {asciimath: "mathtt", atname:"mathvariant", atval:"monospace", tex:"\\mathtt"},
            {asciimath:"fr", atname:"mathvariant", atval:"fraktur", tex:"\\mathfrak"},
            {asciimath: "mathfrak", atname:"mathvariant", atval:"fraktur", tex:"\\mathfrak"},
        ];
        
        this.binary_symbols = [
            {asciimath: "root", tex:"\\sqrt", option: true},
            {asciimath: "frac",    tex:"\\frac"},
            {asciimath: "stackrel", tex:"\\stackrel"},
            {asciimath: "overset", tex:"\\overset"},
            {asciimath: "underset", tex:"\\underset"},
            {asciimath:"color", tex: "\\color", rawfirst: true},
        ]
        
        this.non_constant_symbols = ['_','^','/'];
        
    }

    sort_symbols() {
        const by_asciimath = (a,b)=>{a=a.asciimath.length,b=b.asciimath.length; return a>b ? -1 : a<b ? 1 : 0};
        this.constants.sort(by_asciimath);
        this.relations.sort(by_asciimath);
        this.left_brackets.sort(by_asciimath);
        this.right_brackets.sort(by_asciimath);
        this.leftright_brackets.sort(by_asciimath);
        this.unary_symbols.sort(by_asciimath);
        this.binary_symbols.sort(by_asciimath);
    }
    
    error(message, pos) {
        const neighbourhood = this.source(pos).slice(0,5);
        throw(new Error(`Error at character ${pos} near "${neighbourhood}": ${message}`));
    }
    
    literal(token) {
        if(token) {
            return {tex: token.token, pos: token.pos, end: token.end, ttype: 'literal'};
        }
    }

    longest(matches) {
        matches = matches.filter(x=>!!x);
        matches.sort((x,y)=>{
            x=x.end;
            y=y.end;
            return x>y ? -1 : x<y ? 1 : 0;
        });
        return matches[0];
    }

    escape_text(str) {
        return str
            .replace(/\{/g,'\\{')
            .replace(/\}/g,'\\}')
        ;
    }
    
    input(str) {
        this._source = str;
        this.brackets = [];
    }
    
    source(pos = 0,end) {
        if(arguments.length>1) {
            return this._source.slice(pos,end);
        } else {
            return this._source.slice(pos);
        }
    }
    
    eof(pos = 0) {
        pos = this.strip_space(pos);
        return pos == this._source.length;
    }

    unbracket(tok) {
        if(!tok) {
            return;
        }
        if(!tok.bracket) {
            return tok;
        }

        const skip_brackets = ['(',')','[',']','{','}'];
        const skipleft = skip_brackets.includes(tok.left.asciimath);
        const skipright = skip_brackets.includes(tok.right.asciimath);
        const pos = skipleft ? tok.left.end : tok.pos;
        const end = skipright ? tok.right.pos : tok.end;
        let left = skipleft ? '' : tok.left.tex;
        let right = skipright ? '' : tok.right.tex;
        const middle = tok.middle ? tok.middle.tex : '';
        if(left || right) {
            left = left || '.';
            right = right || '.';
            return {tex: `\\left ${left} ${middle} \\right ${right}`, pos: tok.pos, end: tok.end};
        } else {
            return {tex: middle, pos: tok.pos, end: tok.end, middle_asciimath: this.source(pos,end)};
        }
    }
    
    parse(str) {
        this.input(str);
        const result = this.consume();
        return result.tex;
    }

    consume(pos = 0) {
        let tex = '';
        const exprs = [];
        while(!this.eof(pos)) {
            let expr = this.expression_list(pos);
            if(!expr) {
                const rb = this.right_bracket(pos);
                if(rb) {
                    if(rb.def.free_tex) {
                        rb.tex = rb.def.free_tex;
                    }
                    expr = rb;

                }
                const lr = this.leftright_bracket(pos);
                if(lr) {
                    expr = lr;
                    const ss = this.subsup(lr.end);
                    if(ss) {
                        expr = {tex: `${expr.tex}${ss.tex}`, pos: pos, end: ss.end, ttype: 'expression'}
                    }
                }
            }
            if(expr) {
                if(tex) {
                    tex += ' ';
                }
                tex += expr.tex;
                pos = expr.end;
                exprs.push(expr);
            } else if(!this.eof(pos)) {
                const chr = this.source(pos,pos+1);
                exprs.push({tex: chr, pos: pos, ttype: 'character'});
                tex += chr;
                pos += 1;
            }
        }
        return {tex: tex, exprs: exprs};
    }
    
    strip_space(pos = 0) {
        const osource = this.source(pos);
        const reduced = osource.replace(/^(\s|\\(?!\\))*/,'');
        return pos + osource.length - reduced.length;
    }
    
    /* Does the given regex match next?
     */
    match(re, pos) {
        pos = this.strip_space(pos);
        const m = re.exec(this.source(pos));
        if(m) {
            const token = m[0];
            return {token: token, pos: pos, match: m, end: pos+token.length, ttype: 'regex'};
        }
    }
    
    /* Does the exact given string occur next?
     */
    exact(str, pos) {
        pos = this.strip_space(pos);
        if(this.source(pos).slice(0, str.length) == str) {
            return {token: str, pos: pos, end: pos+str.length, ttype: 'exact'};
        }
    }

    expression_list(pos = 0) {
        let expr = this.expression(pos);
        if(!expr) {
            return;
        }
        let end = expr.end;
        let tex = expr.tex;
        let exprs = [expr];
        while(!this.eof(end)) {
            const comma = this.exact(",",end);
            if(!comma) {
                break;
            }
            tex += ' ,';
            end = comma.end;
            expr = this.expression(end);
            if(!expr) {
                break;
            }
            tex += ' '+expr.tex;
            exprs.push(expr);
            end = expr.end;
        }
        return {tex: tex, pos: pos, end: end, exprs: exprs, ttype: 'expression_list'};
    }
    
    // E ::= IE | I/I                       Expression
    expression(pos = 0) {
        const negative = this.negative_expression(pos);
        if(negative) {
            return negative;
        }
        const first = this.intermediate_or_fraction(pos);
        if(!first) {
            for(let c of this.non_constant_symbols) {
                const m = this.exact(c,pos);
                if(m) {
                    return {tex: c, pos: pos, end: m.end, ttype: 'constant'};
                }
            }
            return;
        }
        if(this.eof(first.end)) {
            return first;
        }
        const second = this.expression(first.end);
        if(second) {
            return {tex: first.tex+' '+second.tex, pos: first.pos, end: second.end, ttype: 'expression', exprs: [first,second]};
        } else {
            return first;
        }
    }

    negative_expression(pos = 0) {
        const dash = this.exact("-",pos);
        if(dash && !this.other_constant(pos)) {
            const expr = this.expression(dash.end);
            if(expr) {
                return {tex: `- ${expr.tex}`, pos: pos, end: expr.end, ttype: 'negative_expression', dash: dash, expression: expr}
            } else {
                return {tex: '-', pos: pos, end: dash.end, ttype: 'constant'};
            }
        }
    }
    
    intermediate_or_fraction(pos = 0) {
        const first = this.intermediate(pos);
        if(!first) {
            return;
        }
        let frac = this.match(/^\/(?!\/)/,first.end);
        if(frac) {
            const second = this.intermediate(frac.end);
            if(second) {
                const ufirst = this.unbracket(first);
                const usecond = this.unbracket(second);
                return {tex: `\\frac{${ufirst.tex}}{${usecond.tex}}`, pos: first.pos, end: second.end, ttype: 'fraction', numerator: ufirst, denominator: usecond};
            } else {
                const ufirst = this.unbracket(first);
                return {tex: `\\frac{${ufirst.tex}}{}`, pos: first.pos, end: frac.end, ttype: 'fraction', numerator: ufirst, denominator: null};
            }
        } else {
            return first;
        }
    }
    
    // I ::= S_S | S^S | S_S^S | S          Intermediate expression
    intermediate(pos = 0) {
        const first = this.simple(pos);
        if(!first) {
            return;
        }
        const ss = this.subsup(first.end);
        if(ss) {
            return {tex: `${first.tex}${ss.tex}`, pos:pos, end:ss.end, ttype: 'intermediate', expression: first, subsup: ss};
        } else {
            return first;
        }
    }

    subsup(pos = 0) {
        let tex = '';
        let end = pos;
        let sub = this.exact('_',pos);
        let sub_expr, sup_expr;
        if(sub) {
            sub_expr = this.unbracket(this.simple(sub.end));
            if(sub_expr) {
                tex = `${tex}_{${sub_expr.tex}}`;
                end = sub_expr.end;
            } else {
                tex = `${tex}_{}`;
                end = sub.end;
            }
        }
        let sup = this.match(/^\^(?!\^)/,end);
        if(sup) {
            sup_expr = this.unbracket(this.simple(sup.end));
            if(sup_expr) {
                tex = `${tex}^{${sup_expr.tex}}`;
                end = sup_expr.end;
            } else {
                tex = `${tex}^{}`;
                end = sup.end;
            }
        }
        if(sub || sup) {
            return {tex: tex, pos: pos, end: end, ttype: 'subsup', sub: sub_expr, sup: sup_expr};
        }
    }

    // S ::= v | lEr | uS | bSS             Simple expression
    simple(pos = 0) {
        return this.longest([this.matrix(pos), this.bracketed_expression(pos), this.binary(pos), this.constant(pos), this.text(pos), this.unary(pos), this.negative_simple(pos)]);
    }

    negative_simple(pos = 0) {
        const dash = this.exact("-",pos);
        if(dash && !this.other_constant(pos)) {
            const expr = this.simple(dash.end);
            if(expr) {
                return {tex: `- ${expr.tex}`, pos: pos, end: expr.end, ttype: 'negative_simple', dash: dash, expr: expr}
            } else {
                return {tex: '-', pos: pos, end: dash.end, ttype: 'constant'};
            }
        }
    }

    // matrix: leftbracket "(" expr ")" ("," "(" expr ")")* rightbracket 
    // each row must have the same number of elements
    matrix(pos = 0) {
        let left = this.left_bracket(pos);
        let lr = false;
        if(!left) {
            left = this.leftright_bracket(pos,'left');
            if(!left) {
                return;
            }
            lr = true;
        }
        const contents = this.matrix_contents(left.end, lr);
        if(!contents) {
            return;
        }
        const right = lr ? this.leftright_bracket(contents.end, 'right') : this.right_bracket(contents.end);
        if(!right) {
            return;
        }
        const contents_tex = contents.rows.map(r=>r.tex).join(' \\\\ ');
        const matrix_tex = contents.is_array ? `\\begin{array}{${contents.column_desc}} ${contents_tex} \\end{array}` : `\\begin{matrix} ${contents_tex} \\end{matrix}`;
        return {tex: `\\left ${left.tex} ${matrix_tex} \\right ${right.tex}`, pos: pos, end: right.end, ttype: 'matrix', rows: contents.rows, left: left, right: right};
    }

    matrix_contents(pos = 0, leftright = false) {
        let rows = [];
        let end = pos;
        let row_length = undefined;
        let column_desc = undefined;
        let is_array = false;
        while(!this.eof(end) && !(leftright ? this.leftright_bracket(end) : this.right_bracket(end))) {
            if(rows.length) {
                const comma = this.exact(",",end);
                if(!comma) {
                    return;
                }
                end = comma.end;
            }
            const lb = this.match(/^[(\[]/,end);
            if(!lb) {
                return;
            }

            const cells = [];
            const columns = [];
            end = lb.end;
            while(!this.eof(end)) {
                if(cells.length) {
                    const comma = this.exact(",",end);
                    if(!comma) {
                        break;
                    }
                    end = comma.end;
                }
                const cell = this.matrix_cell(end);
                if(!cell) {
                    break;
                }
                if(cell.ttype=='column') {
                    columns.push('|');
                    is_array = true;
                    if(cell.expr!==null) {
                        columns.push('r');
                        cells.push(cell.expr);
                    }
                } else {
                    columns.push('r');
                    cells.push(cell);
                }
                end = cell.end;
            }
            if(!cells.length) {
                return;
            }
            if(row_length===undefined) {
                row_length = cells.length;
            } else if(cells.length!=row_length) {
                return;
            }
            const rb = this.match(/^[)\]]/,end);
            if(!rb) {
                return;
            }
            const row_column_desc = columns.join('');
            if(column_desc===undefined) {
                column_desc = row_column_desc;
            } else if(row_column_desc!=column_desc) {
                return;
            }
            rows.push({ttype: 'row', tex: cells.map(c=>c.tex).join(' & '), pos: lb.end, end: end, cells: cells});
            end = rb.end;
        }
        if(row_length===undefined || (row_length<=1 && rows.length<=1)) {
            return;
        }
        return {rows: rows, end: end, column_desc: column_desc, is_array: is_array};
    }

    matrix_cell(pos = 0) {
        const lvert = this.exact('|',pos);
        if(lvert) {
            const middle = this.expression(lvert.end);
            if(middle) {
                const rvert = this.exact('|',middle.end);
                if(rvert) {
                    const second = this.expression(rvert.end);
                    if(second) {
                        return {tex: `\\left \\lvert ${middle.tex} \\right \\rvert ${second.text}`, pos: lvert.pos, end: second.end, ttype: 'expression', exprs: [middle,second]};
                    }
                } else {
                    return {ttype: 'column', expr: middle, pos: lvert.pos, end: middle.end};
                }
            } else {
                return {ttype: 'column', expr: null, pos: lvert.pos, end: lvert.end}
            }
        }
        return this.expression(pos);
    }
    
    bracketed_expression(pos = 0) {
        const l = this.left_bracket(pos);
        if(l) {
            const middle = this.expression_list(l.end);
            if(middle) {
                const r = this.right_bracket(middle.end) || this.leftright_bracket(middle.end,'right');
                if(r) {
                    return {tex: `\\left${l.tex} ${middle.tex} \\right ${r.tex}`, pos: pos, end: r.end, bracket: true, left: l, right: r, middle: middle, ttype: 'bracket'};
                } else if(this.eof(middle.end)) {
                    return {tex: `\\left${l.tex} ${middle.tex} \\right.`, pos: pos, end: middle.end, ttype: 'bracket', left: l, right: null, middle: middle};
                } else {
                    return {tex: `${l.tex} ${middle.tex}`, pos: pos, end: middle.end, ttype: 'expression', exprs: [l,middle]};
                }
            } else {
                const r = this.right_bracket(l.end) || this.leftright_bracket(l.end,'right');
                if(r) {
                    return {tex: `\\left ${l.tex} \\right ${r.tex}`, pos: pos, end: r.end, bracket: true, left: l, right: r, middle: null, ttype: 'bracket'};
                } else {
                    return {tex: l.tex, pos: pos, end: l.end, ttype: 'constant'};
                }
            }
        }
        if(this.other_constant(pos)) {
            return;
        }
        const left = this.leftright_bracket(pos, 'left');
        if(left) {
            const middle = this.expression_list(left.end);
            if(middle) {
                const right = this.leftright_bracket(middle.end, 'right') || this.right_bracket(middle.end);
                if(right) {
                    return {tex: `\\left ${left.tex} ${middle.tex} \\right ${right.tex}`, pos: pos, end: right.end, bracket: true, left: left, right: right, middle: middle, ttype: 'bracket'};
                }
            }
        }
    }
    
    // r ::= ) | ] | } | :) | :} | other right brackets
    right_bracket(pos = 0) {
        for(let bracket of this.right_brackets) {
            const m = this.exact(bracket.asciimath,pos);
            if(m) {
                return {tex: bracket.tex, pos: pos, end: m.end, asciimath: bracket.asciimath, def: bracket, ttype: 'right_bracket'};
            }
        }
    }
    
    // l ::= ( | [ | { | (: | {: | other left brackets
    left_bracket(pos = 0) {
        for(let bracket of this.left_brackets) {
            const m = this.exact(bracket.asciimath,pos);
            if(m) {
                return {tex: bracket.tex, pos: pos, end: m.end, asciimath: bracket.asciimath, ttype: 'left_bracket'};
            }
        }
    }

    leftright_bracket(pos = 0,position) {
        for(let lr of this.leftright_brackets) {
            const b = this.exact(lr.asciimath, pos);
            if(b) {
                return {tex: position=='left' ? lr.left_tex : position=='right' ? lr.right_tex : lr.free_tex, pos: pos, end: b.end, ttype: 'leftright_bracket'};
            }
        }
    }

    text(pos = 0) {
        const quoted = this.match(/^"([^"]*)"/,pos);
        if(quoted) {
            const text = this.escape_text(quoted.match[1]);
            return {tex: `\\text{${text}}`, pos: pos, end: quoted.end, ttype: 'text', text: text};
        }
        const textfn = this.match(/^(?:mbox|text)\s*(\([^)]*\)?|\{[^}]*\}?|\[[^\]]*\]?)/,pos);
        if(textfn) {
            const text = this.escape_text(textfn.match[1].slice(1,textfn.match[1].length-1));
            return {tex: `\\text{${text}}`, pos: pos, end: textfn.end, ttype: 'text', text: text};
        }
    }

    // b ::= frac | root | stackrel | other binary symbols
    binary(pos = 0) {
        for(let binary of this.binary_symbols) {
            const m = this.exact(binary.asciimath, pos);
            const [lb1,rb1] = binary.option ? ['[',']'] : ['{','}'];
            if(m) {
                const a = this.unbracket(this.simple(m.end));
                if(a) {
                    const atex = binary.rawfirst ? a.middle_asciimath : a.tex;
                    const b = this.unbracket(this.simple(a.end));
                    if(b) {
                        return {tex: `${binary.tex}${lb1}${atex}${rb1}{${b.tex}}`, pos: pos, end: b.end, ttype: 'binary', op: binary, arg1: a, arg2: b};
                    } else {
                        return {tex: `${binary.tex}${lb1}${atex}${rb1}{}`, pos: pos, end: a.end, ttype: 'binary', op: binary, arg1: a, arg2: null};
                    }
                } else {
                    return {tex: `${binary.tex}${lb1}${rb1}{}`, pos: pos, end: m.end, ttype: 'binary', op: binary, arg1: null, arg2: null};
                }
            }
        }
    }

    // u ::= sqrt | text | bb | other unary symbols for font commands
    unary(pos = 0) {
        for(let u of this.unary_symbols) {
            const m = this.exact(u.asciimath, pos);
            if(m) {
                const ss = this.subsup(m.end);
                const sstex = ss ? ss.tex : '';
                const end = ss ? ss.end : m.end;
                const barg = this.simple(end);
                const arg = u.func ? barg : this.unbracket(barg);
                const argtex = arg && (u.raw ? arg.middle_asciimath : arg.tex);
                if(u.rewriteleftright) {
                    const [left,right] = u.rewriteleftright;
                    if(arg) {
                        return {tex: `\\left ${left} ${argtex} \\right ${right} ${sstex}`, pos: pos, end: arg.end, ttype: 'unary', op: m, subsup: ss, arg: arg};
                    } else {
                        return {tex: `\\left ${left} \\right ${right} ${sstex}`, pos: pos, end: m.end, ttype: 'unary', op: m, subsup: ss, arg: null};
                    }
                } else {
                    if(arg) {
                        return {tex: `${u.tex}${sstex}{${argtex}}`, pos: pos, end: arg.end, ttype: 'unary', op: m, subsup: ss, arg: arg};
                    } else {
                        return {tex: `${u.tex}${sstex}{}`, pos: pos, end: m.end, ttype: 'unary', op: m, subsup: ss, arg: null};
                    }
                }
            }
        }
    }

    // v ::= [A-Za-z] | greek letters | numbers | other constant symbols
    constant(pos = 0) {
        if(this.right_bracket(pos)) {
            return;
        }
        return this.longest([this.other_constant(pos), this.greek(pos), this.name(pos), this.number(pos), this.arbitrary_constant(pos)]);
    }
    
    name(pos = 0) {
        return this.literal(this.match(/^[A-Za-z]/, pos));
    }
    
    greek(pos = 0) {
        const re_greek = new RegExp('^('+this.greek_letters.join('|')+')');
        const m = this.match(re_greek, pos);
        if(m) {
            return {tex: '\\'+m.token, pos: pos, end: m.end, ttype: 'greek'};
        }
    }
    
    number(pos = 0) {
        const re_number = new RegExp('^\\d+('+this.decimalsign+'\\d+)?');
        return this.literal(this.match(re_number, pos));
    }

    other_constant(pos = 0) {
        for(let sym of this.constants) {
            let m = this.exact(sym.asciimath, pos);
            if(m) {
                return {tex: `${sym.tex}`, pos: m.pos, end: m.end, ttype: 'other_constant'};
            }
        }
        for(let sym of this.relations) {
            if(!sym.asciimath.match(/^!/)) {
                let notm = this.exact('!'+sym.asciimath, pos);
                if(notm) {
                    return {tex: `\\not ${sym.tex}`, pos: notm.pos, end: notm.end, ttype: 'other_constant'};
                }
            }
        }
    }
    
    arbitrary_constant(pos = 0) {
        if(!this.eof(pos)) {
            if(this.exact(",",pos)) {
                return;
            }
            for(let nc of this.non_constant_symbols.concat(this.left_brackets.map(x=>x.asciimath), this.right_brackets.map(x=>x.asciimath), this.leftright_brackets.map(x=>x.asciimath))) {
                if(this.exact(nc, pos)) {
                    return;
                }
            }
            const spos = this.strip_space(pos);
            const symbol = this.source(spos).slice(0,1);
            return {tex: symbol, pos: pos, end: spos+1, ttype: 'arbitrary_constant'};
        }
    }
}

export default AsciiMathParser;