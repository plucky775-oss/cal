
import tkinter as tk
from tkinter import ttk, messagebox
import math

class DistCalcApp:
    def __init__(self, root):
        self.root = root
        self.root.title("배전공사 설계자용 계산기 v1.0")
        self.root.geometry("450x550")
        
        # 스타일 설정
        style = ttk.Style()
        style.configure("TNotebook.Tab", padding=[10, 5])
        
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(expand=True, fill='both', padx=10, pady=10)
        
        # 탭 추가
        self.setup_voltage_drop_tab()
        self.setup_power_factor_tab()
        self.setup_info_tab()

    def setup_voltage_drop_tab(self):
        tab = ttk.Frame(self.notebook)
        self.notebook.add(tab, text="전압강하 계산")
        
        padding = {'padx': 15, 'pady': 10}
        
        # 입력 필드들
        ttk.Label(tab, text="전선 길이 (L, m):").grid(row=0, column=0, sticky='w', **padding)
        self.ent_L = ttk.Entry(tab)
        self.ent_L.grid(row=0, column=1, **padding)
        
        ttk.Label(tab, text="부하 전류 (I, A):").grid(row=1, column=0, sticky='w', **padding)
        self.ent_I = ttk.Entry(tab)
        self.ent_I.grid(row=1, column=1, **padding)
        
        ttk.Label(tab, text="전선 단면적 (A, mm²):").grid(row=2, column=0, sticky='w', **padding)
        self.ent_Area = ttk.Entry(tab)
        self.ent_Area.grid(row=2, column=1, **padding)
        
        ttk.Label(tab, text="배전 방식:").grid(row=3, column=0, sticky='w', **padding)
        self.combo_type = ttk.Combobox(tab, values=["단상 2선식 / 3상 4선식", "3상 3선식"])
        self.combo_type.current(0)
        self.combo_type.grid(row=3, column=1, **padding)
        
        btn_calc = ttk.Button(tab, text="계산하기", command=self.calc_voltage_drop)
        btn_calc.grid(row=4, column=0, columnspan=2, pady=20)
        
        self.lbl_vd_res = ttk.Label(tab, text="결과: - V", font=('Arial', 12, 'bold'))
        self.lbl_vd_res.grid(row=5, column=0, columnspan=2)

    def calc_voltage_drop(self):
        try:
            L = float(self.ent_L.get())
            I = float(self.ent_I.get())
            A = float(self.ent_Area.get())
            dtype = self.combo_type.get()
            
            # 기본 계수 (전선 저항 계수 17.8 기준)
            k = 17.8 if "단상 2선식" in dtype else 30.8
            
            # e = (k * L * I) / (1000 * A)
            vd = (k * L * I) / (1000 * A)
            
            self.lbl_vd_res.config(text=f"예상 전압강하: {vd:.3f} V")
        except ValueError:
            messagebox.showerror("입력 오류", "숫자만 입력해주세요.")

    def setup_power_factor_tab(self):
        tab = ttk.Frame(self.notebook)
        self.notebook.add(tab, text="역률 개선(콘덴서)")
        
        padding = {'padx': 15, 'pady': 10}
        
        ttk.Label(tab, text="부하 전력 (P, kW):").grid(row=0, column=0, sticky='w', **padding)
        self.ent_P = ttk.Entry(tab)
        self.ent_P.grid(row=0, column=1, **padding)
        
        ttk.Label(tab, text="현재 역률 (cosθ1, %):").grid(row=1, column=0, sticky='w', **padding)
        self.ent_pf1 = ttk.Entry(tab)
        self.ent_pf1.insert(0, "80")
        self.ent_pf1.grid(row=1, column=1, **padding)
        
        ttk.Label(tab, text="목표 역률 (cosθ2, %):").grid(row=2, column=0, sticky='w', **padding)
        self.ent_pf2 = ttk.Entry(tab)
        self.ent_pf2.insert(0, "95")
        self.ent_pf2.grid(row=2, column=1, **padding)
        
        btn_calc_pf = ttk.Button(tab, text="콘덴서 용량 계산", command=self.calc_pf)
        btn_calc_pf.grid(row=3, column=0, columnspan=2, pady=20)
        
        self.lbl_pf_res = ttk.Label(tab, text="필요 용량: - kVA", font=('Arial', 12, 'bold'))
        self.lbl_pf_res.grid(row=4, column=0, columnspan=2)

    def calc_pf(self):
        try:
            P = float(self.ent_P.get())
            pf1 = float(self.ent_pf1.get()) / 100
            pf2 = float(self.ent_pf2.get()) / 100
            
            if pf1 >= 1 or pf2 >= 1 or pf1 <= 0 or pf2 <= 0:
                raise ValueError
                
            tan1 = math.sqrt(1 - pf1**2) / pf1
            tan2 = math.sqrt(1 - pf2**2) / pf2
            
            Q = P * (tan1 - tan2)
            self.lbl_pf_res.config(text=f"필요 콘덴서 용량: {Q:.2f} kVA")
        except ValueError:
            messagebox.showerror("입력 오류", "올바른 숫자 범위를 입력하세요 (역률 1~99).")

    def setup_info_tab(self):
        tab = ttk.Frame(self.notebook)
        self.notebook.add(tab, text="정보")
        info_text = (
            "\n[배전공사 설계 보조 계산기]\n\n"
            "1. 전압강하 계산:\n"
            "   - 17.8/30.8 공식을 적용합니다.\n"
            "   - L(m), I(A), A(mm²) 기준\n\n"
            "2. 역률 개선:\n"
            "   - 부하 용량 대비 목표 역률 도달에\n"
            "     필요한 전력용 콘덴서 용량 산출\n\n"
            "제작: AI 어시스턴트"
        )
        lbl = ttk.Label(tab, text=info_text, justify='left', padding=20)
        lbl.pack()

if __name__ == "__main__":
    root = tk.Tk()
    app = DistCalcApp(root)
    root.mainloop()
