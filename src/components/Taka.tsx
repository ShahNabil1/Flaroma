interface TakaProps {
  amount: number | string;
  className?: string;
}

const Taka = ({ amount, className = "" }: TakaProps) => (
  <span className={`font-num ${className}`}>
    <span className="font-bold text-[1.15em] align-baseline">৳</span>
    &nbsp;{amount}
  </span>
);

export default Taka;
